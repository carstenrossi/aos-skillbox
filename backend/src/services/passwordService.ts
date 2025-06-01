interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  forbiddenPatterns: string[];
  maxRepeatingChars: number;
  forbidCommonPasswords: boolean;
}

class PasswordService {
  private defaultPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minSpecialChars: 1,
    forbiddenPatterns: [
      'password', 'passwort', '123456', 'qwerty', 'admin', 'user',
      'skillbox', 'test', 'demo', 'guest', 'root'
    ],
    maxRepeatingChars: 3,
    forbidCommonPasswords: true,
  };

  // Common weak passwords (Top 100 subset)
  private commonPasswords = new Set([
    'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
    'password1', '12345678', '123123', '1234567890', 'qwerty123',
    'admin', 'administrator', 'root', 'user', 'guest', 'demo', 'test',
    'welcome', 'login', 'pass', 'master', 'secret', 'letmein',
    'monkey', 'dragon', 'football', 'baseball', 'basketball',
    'superman', 'batman', 'princess', 'sunshine', 'iloveyou',
    'trustno1', 'hello', 'welcome1', 'password2', 'welcome123'
  ]);

  validatePassword(
    password: string, 
    policy: Partial<PasswordPolicy> = {},
    username?: string,
    email?: string
  ): PasswordValidationResult {
    const activePolicy = { ...this.defaultPolicy, ...policy };
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Length validation
    if (password.length < activePolicy.minLength) {
      errors.push(`Password must be at least ${activePolicy.minLength} characters long`);
    } else if (password.length >= activePolicy.minLength) {
      score += 10;
    }

    if (password.length > activePolicy.maxLength) {
      errors.push(`Password must not exceed ${activePolicy.maxLength} characters`);
    } else if (password.length >= 12) {
      score += 10; // Bonus for longer passwords
    }

    // Character type requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const specialCharCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;

    if (activePolicy.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
      score += 15;
    }

    if (activePolicy.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
      score += 10;
    }

    if (activePolicy.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number');
    } else if (hasNumbers) {
      score += 15;
    }

    if (activePolicy.requireSpecialChars && !hasSpecialChars) {
      errors.push('Password must contain at least one special character');
    } else if (hasSpecialChars) {
      score += 20;
    }

    if (specialCharCount < activePolicy.minSpecialChars) {
      errors.push(`Password must contain at least ${activePolicy.minSpecialChars} special characters`);
    } else if (specialCharCount >= 2) {
      score += 10; // Bonus for multiple special chars
    }

    // Pattern checks
    const lowerPassword = password.toLowerCase();
    
    // Check forbidden patterns
    for (const pattern of activePolicy.forbiddenPatterns) {
      if (lowerPassword.includes(pattern.toLowerCase())) {
        errors.push(`Password must not contain "${pattern}"`);
      }
    }

    // Check against username/email
    if (username && lowerPassword.includes(username.toLowerCase())) {
      errors.push('Password must not contain your username');
    }

    if (email) {
      const emailPart = email.split('@')[0].toLowerCase();
      if (emailPart.length >= 3 && lowerPassword.includes(emailPart)) {
        errors.push('Password must not contain your email address');
      }
    }

    // Check repeating characters
    const repeatingChars = this.findRepeatingCharacters(password);
    if (repeatingChars > activePolicy.maxRepeatingChars) {
      errors.push(`Password must not have more than ${activePolicy.maxRepeatingChars} repeating characters`);
    }

    // Check common passwords
    if (activePolicy.forbidCommonPasswords && this.commonPasswords.has(lowerPassword)) {
      errors.push('This is a commonly used password. Please choose a more unique password');
    }

    // Sequential characters check
    if (this.hasSequentialChars(password)) {
      errors.push('Password should not contain sequential characters (e.g., 123, abc)');
      score -= 10;
    } else {
      score += 5;
    }

    // Keyboard patterns check
    if (this.hasKeyboardPattern(password)) {
      errors.push('Password should not contain keyboard patterns (e.g., qwerty, asdf)');
      score -= 10;
    } else {
      score += 5;
    }

    // Additional scoring for complexity
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.8) {
      score += 10; // High character diversity
    }

    // Entropy bonus
    const entropy = this.calculateEntropy(password);
    if (entropy > 50) score += 10;
    if (entropy > 70) score += 10;

    // Normalize score
    score = Math.min(100, Math.max(0, score));

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score < 30) strength = 'weak';
    else if (score < 60) strength = 'medium';
    else if (score < 85) strength = 'strong';
    else strength = 'very_strong';

    // Generate suggestions
    if (!hasUppercase) suggestions.push('Add uppercase letters');
    if (!hasLowercase) suggestions.push('Add lowercase letters');
    if (!hasNumbers) suggestions.push('Add numbers');
    if (!hasSpecialChars) suggestions.push('Add special characters (!@#$%^&*)');
    if (password.length < 12) suggestions.push('Consider using a longer password (12+ characters)');
    if (strength === 'weak') suggestions.push('Consider using a passphrase with multiple words');

    const isValid = errors.length === 0;

    return {
      isValid,
      strength,
      score,
      errors,
      suggestions,
    };
  }

  private findRepeatingCharacters(password: string): number {
    let maxRepeating = 1;
    let currentRepeating = 1;

    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        currentRepeating++;
      } else {
        maxRepeating = Math.max(maxRepeating, currentRepeating);
        currentRepeating = 1;
      }
    }

    return Math.max(maxRepeating, currentRepeating);
  }

  private hasSequentialChars(password: string): boolean {
    const sequences = [
      '0123456789',
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    ];

    const lowerPassword = password.toLowerCase();

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substr(i, 3);
        if (lowerPassword.includes(subseq)) {
          return true;
        }
        // Check reverse sequence
        const reverseSubseq = subseq.split('').reverse().join('');
        if (lowerPassword.includes(reverseSubseq)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasKeyboardPattern(password: string): boolean {
    const keyboardRows = [
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
      '1234567890'
    ];

    const lowerPassword = password.toLowerCase();

    for (const row of keyboardRows) {
      for (let i = 0; i <= row.length - 3; i++) {
        const pattern = row.substr(i, 3);
        if (lowerPassword.includes(pattern)) {
          return true;
        }
        // Check reverse pattern
        const reversePattern = pattern.split('').reverse().join('');
        if (lowerPassword.includes(reversePattern)) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateEntropy(password: string): number {
    const charset = this.getCharsetSize(password);
    const length = password.length;
    
    // Entropy = log2(charset^length)
    return length * Math.log2(charset);
  }

  private getCharsetSize(password: string): number {
    let charsetSize = 0;
    
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) charsetSize += 32;
    
    return charsetSize;
  }

  // Generate a secure random password
  generateSecurePassword(
    length: number = 16,
    policy: Partial<PasswordPolicy> = {}
  ): string {
    const activePolicy = { ...this.defaultPolicy, ...policy };
    
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = '';
    let requiredChars = '';
    
    if (activePolicy.requireLowercase) {
      charset += lowercase;
      requiredChars += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    
    if (activePolicy.requireUppercase) {
      charset += uppercase;
      requiredChars += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    
    if (activePolicy.requireNumbers) {
      charset += numbers;
      requiredChars += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    if (activePolicy.requireSpecialChars) {
      charset += specialChars;
      requiredChars += specialChars[Math.floor(Math.random() * specialChars.length)];
    }
    
    // Fill remaining length with random characters
    let password = requiredChars;
    const remainingLength = length - requiredChars.length;
    
    for (let i = 0; i < remainingLength; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password);
  }

  private shuffleString(str: string): string {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  // Check if password has been compromised (would integrate with HaveIBeenPwned API)
  async isPasswordCompromised(password: string): Promise<boolean> {
    // In production, you would hash the password with SHA-1 and check against
    // the HaveIBeenPwned API using k-anonymity
    // For now, just check against our common passwords list
    return this.commonPasswords.has(password.toLowerCase());
  }

  // Get password policy for different user roles
  getPolicyForRole(role: string): PasswordPolicy {
    switch (role) {
      case 'admin':
        return {
          ...this.defaultPolicy,
          minLength: 12,
          requireSpecialChars: true,
          minSpecialChars: 2,
          maxRepeatingChars: 2,
        };
      case 'manager':
        return {
          ...this.defaultPolicy,
          minLength: 10,
          requireSpecialChars: true,
          minSpecialChars: 1,
        };
      default:
        return this.defaultPolicy;
    }
  }
}

export default new PasswordService(); 