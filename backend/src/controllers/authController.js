const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTPEmail } = require('../services/emailService');

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
    const { name, email, password, department, role } = req.body;

    if (!email.endsWith('@ssism.org')) {
      return res.status(400).json({ message: 'Only @ssism.org email addresses are allowed' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userData = { name, email, password, role: role || 'user' };
    if (role !== 'admin') {
      userData.department = department;
    }

    const user = await User.create(userData);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📧 OTP request received for email:', email);

    if (!email.endsWith('@ssism.org')) {
      console.log('❌ Invalid email domain:', email);
      return res.status(400).json({ message: 'Only @ssism.org email addresses are allowed' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log('✅ OTP generated and saved:', otp);

    try {
      await sendOTPEmail(email, user.name, otp);
      console.log('✅ OTP email sent successfully to:', email);
      res.json({ message: 'OTP sent to your email', success: true });
    } catch (emailError) {
      console.error('❌ Email send error:', emailError.message);
      console.error('Full error:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send OTP email. Please check your internet connection and try again.',
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔑 OTP verification request for:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp) {
      console.log('❌ Invalid OTP. Expected:', user.otp, 'Received:', otp);
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      console.log('❌ OTP expired for:', email);
      return res.status(401).json({ message: 'OTP expired' });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log('✅ OTP verified successfully for:', email);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    if (new Date() > user.refreshTokenExpiry) {
      return res.status(403).json({ message: 'Refresh token expired' });
    }

    const newAccessToken = generateAccessToken(user._id);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.refreshToken = undefined;
    user.refreshTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
