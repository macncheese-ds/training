const { trainingPool } = require('../config/db');

/**
 * Called when a training assignment is marked completed.
 * Updates employee_skills based on training_skills mappings.
 */
async function onTrainingCompleted(assignment) {
  try {
    const [mappings] = await trainingPool.query(
      'SELECT * FROM training_skills WHERE training_id = ?', [assignment.training_id]
    );
    for (const m of mappings) {
      // If no exam score required, grant the skill level
      if (!m.min_exam_score) {
        await upsertSkill(assignment.user_id, m.skill_id, m.grants_level, 'training', assignment.id);
      }
    }
  } catch (err) {
    console.error('[SKILLS_SERVICE] onTrainingCompleted:', err);
  }
}

/**
 * Called when an exam is passed.
 * Two paths to skill matrix update:
 *   1. Via training link (existing): exam → training_exams → training_skills
 *   2. Via direct flag (new): exam.affects_skill_matrix=1 → exam.linked_skill_id
 * Both paths are non-destructive: skills only go up, never down.
 */
async function onExamPassed(assignmentId, examId, userId, score) {
  try {
    // ── Path 1: training → skill mapping ──────────────────────────────────
    const [links] = await trainingPool.query(
      'SELECT training_id FROM training_exams WHERE exam_id = ?', [examId]
    );
    for (const link of links) {
      const [mappings] = await trainingPool.query(
        'SELECT * FROM training_skills WHERE training_id = ?', [link.training_id]
      );
      for (const m of mappings) {
        if (m.min_exam_score && score >= parseFloat(m.min_exam_score)) {
          await upsertSkill(userId, m.skill_id, m.grants_level, 'exam', assignmentId);
        }
      }
    }

    // ── Path 2: exam directly affects skill matrix ─────────────────────────
    const [examRows] = await trainingPool.query(
      'SELECT affects_skill_matrix, linked_skill_id, skill_level_granted, passing_score FROM exams WHERE id = ?',
      [examId]
    );
    if (examRows.length && examRows[0].affects_skill_matrix && examRows[0].linked_skill_id) {
      const e = examRows[0];
      if (score >= parseFloat(e.passing_score)) {
        await upsertSkill(userId, e.linked_skill_id, e.skill_level_granted || 1, 'exam', examId);
      }
    }

    // Also mark assignment completed if not already
    if (assignmentId) {
      await trainingPool.execute(
        `UPDATE training_assignments SET status = 'completed', completed_at = NOW()
         WHERE id = ? AND status != 'completed'`, [assignmentId]
      );
    }
  } catch (err) {
    console.error('[SKILLS_SERVICE] onExamPassed:', err);
  }
}

async function upsertSkill(userId, skillId, level, via, sourceId) {
  // Only upgrade, never downgrade
  const [existing] = await trainingPool.query(
    'SELECT current_level FROM employee_skills WHERE user_id = ? AND skill_id = ? ORDER BY current_level DESC LIMIT 1',
    [userId, skillId]
  );
  if (existing.length && existing[0].current_level >= level) return;

  await trainingPool.execute(
    `INSERT INTO employee_skills (user_id, skill_id, current_level, achieved_via, source_id, achieved_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [userId, skillId, level, via, sourceId || null]
  );
}

module.exports = { onTrainingCompleted, onExamPassed };
