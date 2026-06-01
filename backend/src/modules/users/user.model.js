import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 12;

// Refresh tokens are high-entropy JWTs, so we store a SHA-256 hash (not bcrypt):
// bcrypt silently truncates input to 72 bytes, and a JWT's first 72 bytes are
// identical across a user's tokens — which would make rotation/revocation fail.
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // Never return the hash by default; must be explicitly selected.
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Hashed, currently-valid refresh tokens. Enables logout + rotation + multi-device.
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.refreshTokens;
        return ret;
      },
    },
  }
);

// Hash the password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Store only a hash of the refresh token, never the raw value.
userSchema.methods.addRefreshToken = async function addRefreshToken(rawToken) {
  this.refreshTokens.push(hashToken(rawToken));
  await this.save();
};

userSchema.methods.hasRefreshToken = function hasRefreshToken(rawToken) {
  const hash = hashToken(rawToken);
  return this.refreshTokens.includes(hash) ? hash : null;
};

userSchema.methods.removeRefreshToken = async function removeRefreshToken(hash) {
  this.refreshTokens = this.refreshTokens.filter((h) => h !== hash);
  await this.save();
};

userSchema.methods.clearRefreshTokens = async function clearRefreshTokens() {
  this.refreshTokens = [];
  await this.save();
};

export const User = mongoose.model('User', userSchema);
