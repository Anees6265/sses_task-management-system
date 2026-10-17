const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { sendOTPEmail } = require('../services/emailService');
const { demoUsers } = require('../utils/mockStore');

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '2d' });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, department, role, phoneNumber, telegramChatId } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@ssism\.org$/i;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Only valid @ssism.org email addresses are allowed' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (!password || password.length < 8 || password.length > 18) {
      return res.status(400).json({ message: 'Password must be between 8 and 18 characters long' });
    }

    let formattedPhone = '';
    if (phoneNumber && phoneNumber.trim()) {
      const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
      if (!/^\+91[0-9]{10}$/.test(cleanPhone)) {
        return res.status(400).json({ message: 'Mobile number must include +91 country code and 10 digits (e.g. +91 9876543210)' });
      }
      formattedPhone = `+91 ${cleanPhone.slice(3)}`;
    }

    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const userData = { 
        name: name.trim(), 
        email: normalizedEmail, 
        password, 
        role: role || 'user',
        phoneNumber: formattedPhone,
        telegramChatId: telegramChatId ? telegramChatId.trim() : undefined
      };
      if (role !== 'admin') {
        userData.department = department;
      }

      const user = await User.create(userData);

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      user.refreshToken = refreshToken;
      user.refreshTokenExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      await user.save();

      const demoIndex = demoUsers.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      if (demoIndex === -1) {
        demoUsers.push({
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          passwordRaw: password,
          role: user.role,
          department: user.department,
          phoneNumber: user.phoneNumber || ''
        });
      }

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        phoneNumber: user.phoneNumber,
        accessToken,
        refreshToken
      });
    } else {
      // Offline mock fallback
      const newUser = {
        _id: '64e' + Date.now().toString(16),
        name: name.trim(),
        email: normalizedEmail,
        department,
        role: role || 'user',
        phoneNumber: formattedPhone
      };
      demoUsers.push({ ...newUser, passwordRaw: password });
      const accessToken = generateAccessToken(newUser._id);
      const refreshToken = generateRefreshToken(newUser._id);
      return res.status(201).json({ ...newUser, accessToken, refreshToken });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim().toLowerCase().endsWith('@ssism.org')) {
      return res.status(400).json({ message: 'Only @ssism.org email addresses are allowed' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      user.refreshToken = refreshToken;
      user.refreshTokenExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      await user.save();

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        accessToken,
        refreshToken
      });
    } else {
      // Offline code fallback mode
      console.log('⚡ Handling login via Code Mock Fallback for:', normalizedEmail);
      const demoUser = demoUsers.find(u => u.email.toLowerCase() === normalizedEmail);

      if (!demoUser || (password && demoUser.passwordRaw !== password)) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const accessToken = generateAccessToken(demoUser._id);
      const refreshToken = generateRefreshToken(demoUser._id);

      return res.json({
        _id: demoUser._id,
        name: demoUser.name,
        email: demoUser.email,
        department: demoUser.department,
        role: demoUser.role,
        accessToken,
        refreshToken
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@ssism\.org$/i;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Only valid @ssism.org email addresses are allowed' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found with this email' });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      try {
        await sendOTPEmail(email, user.name, otp);
        return res.json({ message: 'OTP sent to your email', success: true });
      } catch (emailError) {
        return res.status(500).json({
          message: 'Failed to send OTP email.',
          error: emailError.message
        });
      }
    } else {
      const demoUser = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!demoUser) return res.status(404).json({ message: 'User not found with this email' });
      demoUser.otp = '123456';
      console.log(`🔑 DEMO MODE OTP for ${email}: 123456`);
      return res.json({ message: 'OTP sent (Demo OTP: 123456)', success: true, demoOtp: '123456' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email });
      if (!user || !user.otp || user.otp !== otp) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }
      user.otp = undefined;
      await user.save();

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        accessToken,
        refreshToken
      });
    } else {
      const demoUser = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!demoUser || (otp !== '123456' && demoUser.otp !== otp)) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }

      const accessToken = generateAccessToken(demoUser._id);
      const refreshToken = generateRefreshToken(demoUser._id);

      return res.json({
        _id: demoUser._id,
        name: demoUser.name,
        email: demoUser.email,
        department: demoUser.department,
        role: demoUser.role,
        accessToken,
        refreshToken
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const newAccessToken = generateAccessToken(decoded.id);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};
