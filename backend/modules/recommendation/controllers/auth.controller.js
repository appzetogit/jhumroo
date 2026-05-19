import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../../config/postgres.js';

/**
 * Register a new user in the PostgreSQL system with preference interests.
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password, interests } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required fields.'
      });
    }

    // Check for existing username or email
    const duplicateCheck = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
      [email.toLowerCase().trim(), username.trim()]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email is already registered.'
      });
    }

    // Hash the password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Standardize interests to lowercased string arrays
    const formattedInterests = Array.isArray(interests) 
      ? interests.map(tag => tag.toLowerCase().trim()) 
      : [];

    const insertResult = await query(
      `INSERT INTO users (username, email, password_hash, interests)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, interests, created_at`,
      [username.trim(), email.toLowerCase().trim(), passwordHash, formattedInterests]
    );

    const user = insertResult.rows[0];

    // Sign Access JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '24h'
    });

    res.status(201).json({
      success: true,
      message: 'User account created in Postgres successfully.',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user and authenticate using password validation in Postgres.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const userResult = await query(
      'SELECT id, username, email, password_hash, interests FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    const user = userResult.rows[0];

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Sign Access JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '24h'
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        interests: user.interests
      }
    });
  } catch (error) {
    next(error);
  }
};
