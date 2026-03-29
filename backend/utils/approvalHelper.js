/**
 * Determines the matching approval rule for an expense.
 * Priority: most specific (category + threshold) → category only → threshold only → default
 */
const ApprovalRule = require('../models/ApprovalRule');

async function findMatchingRule(companyId, category, amount) {
  const rules = await ApprovalRule.find({ company: companyId, isActive: true })
    .populate('approvers.user', 'name email role')
    .populate('conditionalApproval.specificApprover', 'name email');

  // Score: category match = 2, threshold match = 1
  let best = null;
  let bestScore = -1;

  for (const rule of rules) {
    let score = 0;
    const categoryMatch = !rule.category || rule.category.toLowerCase() === category.toLowerCase();
    const thresholdMatch = rule.amountThreshold === null || amount > rule.amountThreshold;

    if (!categoryMatch || !thresholdMatch) continue;
    if (rule.category) score += 2;
    if (rule.amountThreshold !== null) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  return best;
}

/**
 * Builds approval steps array for an expense.
 * If isManagerApprover on rule, prepend employee's manager as step 0.
 */
function buildApprovalSteps(rule, employeeManager) {
  const steps = [];

  if (rule.isManagerApprover && employeeManager) {
    steps.push({
      approver: employeeManager._id || employeeManager,
      order: 0,
      status: 'pending',
      isManagerStep: true,
    });
  }

  const sorted = [...rule.approvers].sort((a, b) => a.order - b.order);
  sorted.forEach((a, idx) => {
    steps.push({
      approver: a.user._id || a.user,
      order: rule.isManagerApprover ? idx + 1 : idx,
      status: 'pending',
      isManagerStep: false,
    });
  });

  return steps;
}

/**
 * Evaluate conditional approval after a step is approved.
 * Returns 'approved' | 'continue' | 'rejected'
 */
function evaluateConditional(expense, rule) {
  if (!rule.conditionalApproval?.enabled) return 'continue';

  const { percentageThreshold, specificApprover, hybridMode } = rule.conditionalApproval;
  const approvedSteps = expense.approvalSteps.filter(s => s.status === 'approved');
  const totalSteps = expense.approvalSteps.length;

  let percentageMet = false;
  let specificMet = false;

  if (percentageThreshold !== null && totalSteps > 0) {
    percentageMet = (approvedSteps.length / totalSteps) * 100 >= percentageThreshold;
  }

  if (specificApprover) {
    specificMet = approvedSteps.some(s =>
      s.approver.toString() === specificApprover.toString()
    );
  }

  if (hybridMode) {
    if (percentageMet || specificMet) return 'approved';
  } else {
    if (percentageMet) return 'approved';
    if (specificMet) return 'approved';
  }

  return 'continue';
}

module.exports = { findMatchingRule, buildApprovalSteps, evaluateConditional };
