function validatePassword(password, policy) {
  const errors = [];

  if (!password || password.length < policy.min_length) {
    errors.push(`at least ${policy.min_length} characters`);
  }

  const checks = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  if (policy.require_uppercase && !checks.uppercase) {
    errors.push("one uppercase letter");
  }

  if (policy.require_lowercase && !checks.lowercase) {
    errors.push("one lowercase letter");
  }

  if (policy.require_numbers && !checks.numbers) {
    errors.push("one number");
  }

  if (policy.require_special_chars && !checks.special) {
    errors.push("one special character");
  }

  const categoryCount = Object.values(checks).filter(Boolean).length;
  if (categoryCount < policy.min_complexity_categories) {
    errors.push(`at least ${policy.min_complexity_categories} complexity categories`);
  }

  const lowered = password.toLowerCase();
  const blocked = (policy.blocked_keywords || []).map((w) => w.toLowerCase());
  const hasBlockedKeyword = blocked.some((word) => lowered.includes(word));

  // Keep feedback focused: only show blocked-keyword warning when all base rules pass.
  if (hasBlockedKeyword && errors.length === 0) {
    errors.push("blocked keywords are not allowed");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function getPasswordRequirementsMessage(policy) {
  const requirements = [];

  if (policy.min_length) {
    requirements.push(`minimum ${policy.min_length} characters`);
  }

  if (policy.require_uppercase) {
    requirements.push("an uppercase letter");
  }

  if (policy.require_lowercase) {
    requirements.push("a lowercase letter");
  }

  if (policy.require_numbers) {
    requirements.push("a number");
  }

  if (policy.require_special_chars) {
    requirements.push("a special character");
  }

  if (requirements.length === 0) {
    return "Password does not meet security requirements.";
  }

  if (requirements.length === 1) {
    return `Password should contain ${requirements[0]}.`;
  }

  const last = requirements.pop();
  return `Password should contain ${requirements.join(", ")} and ${last}.`;
}

module.exports = {
  validatePassword,
  getPasswordRequirementsMessage
};
