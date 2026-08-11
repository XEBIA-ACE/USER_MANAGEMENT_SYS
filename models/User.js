/**
 * User Mongoose model.
 * Enforces email uniqueness at the schema level as a second line of defence
 * (the primary check is performed in userService.js before the save call).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // NIST-recommended work factor for bcrypt

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,           // DB-level unique index
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    // Passwords are stored as bcrypt hashes — never plain-text
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

/**
 * Pre-save hook: hash the password whenever it is set or modified.
 * The raw password is never persisted.
 */
userSchema.pre('save', async function hashPassword(next) {
  // Only re-hash when the passwordHash field has been explicitly set to a
  // plain-text value via setPassword() below.
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Instance helper: verify a candidate password against the stored hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.verifyPassword = function verifyPassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Convenience setter so callers can write:
 *   user.setPassword('plainText')
 * and the pre-save hook will hash it automatically.
 * @param {string} plainPassword
 */
userSchema.methods.setPassword = function setPassword(plainPassword) {
  // Assign to passwordHash; the pre-save hook detects the modification and hashes it.
  this.passwordHash = plainPassword;
};

// Never expose the password hash in JSON responses
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
