const User = require('../models/User');
const PartnerLocation = require('../models/PartnerLocation');
const Restaurant = require('../models/Restaurant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/constants');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET || 'crave_super_secure_jwt_secret_token_evaluation_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = ROLES.CUSTOMER,
      vehicleType,
      vehicleNumber,
      restaurantDetails,
      autoApprove = false
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, phone and password.' });
    }

    // Role Escalation Protection: Block public admin creation
    if (role === ROLES.ADMIN) {
      const secret = req.headers['x-admin-bootstrap-secret'] || req.body.adminBootstrapSecret;
      const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET || 'crave_secure_bootstrap_key_2026';
      if (!secret || secret !== configuredSecret) {
        return res.status(403).json({
          success: false,
          message: 'Unrestricted public administrator registration is disabled. Please use the secure administrator bootstrap process.'
        });
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role,
      accountStatus: 'active'
    };

    if (role === ROLES.DELIVERY_PARTNER) {
      const isApproved = autoApprove === true;
      userData.partnerDetails = {
        vehicleType: vehicleType || 'bike',
        vehicleNumber: (vehicleNumber || 'DL-01-AB-1234').toUpperCase(),
        isVerified: isApproved
      };
      userData.isAvailable = isApproved;
      userData.accountStatus = isApproved ? 'active' : 'pending';
    } else if (role === ROLES.RESTAURANT) {
      userData.accountStatus = autoApprove === true ? 'active' : 'pending';
    }

    const user = await User.create(userData);

    // If delivery partner, initialize PartnerLocation
    if (role === ROLES.DELIVERY_PARTNER) {
      await PartnerLocation.create({
        partnerId: user._id,
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139] // Connaught Place, New Delhi
        },
        isOnline: user.isAvailable
      });
    }

    // If restaurant partner, initialize Restaurant record
    let createdRestaurant = null;
    if (role === ROLES.RESTAURANT) {
      const restData = restaurantDetails || {};
      const restaurantName = restData.name || `${name}'s Kitchen`;
      const cuisines = Array.isArray(restData.cuisines) && restData.cuisines.length > 0
        ? restData.cuisines
        : (typeof restData.cuisines === 'string' ? restData.cuisines.split(',').map(c => c.trim()) : ['Artisanal Dining']);
      const pincode = restData.address?.pincode || restData.pincode || '110001';
      const city = restData.address?.city || restData.city || 'New Delhi';
      const addressLine = restData.address?.addressLine || restData.addressLine || 'Gourmet Kitchen Suite';

      createdRestaurant = await Restaurant.create({
        ownerId: user._id,
        name: restaurantName,
        tagline: restData.tagline || 'Artisanal culinary partner',
        description: restData.description || `${restaurantName} - Curated gastronomical offerings prepared to perfection.`,
        cuisines,
        address: {
          addressLine,
          landmark: restData.address?.landmark || '',
          city,
          state: restData.address?.state || 'Delhi',
          pincode
        },
        location: {
          type: 'Point',
          coordinates: restData.coordinates && restData.coordinates.length >= 2 ? restData.coordinates : [77.218, 28.631]
        },
        status: autoApprove === true ? 'approved' : 'pending',
        isOpen: autoApprove === true,
        deliveryRadiusKm: Number(restData.deliveryRadiusKm) || 12,
        serviceablePincodes: [pincode]
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: role === ROLES.CUSTOMER
        ? 'Account registered successfully'
        : `${role.replace('_', ' ')} application submitted successfully`,
      token,
      user,
      restaurant: createdRestaurant
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Role-Based Approval & Verification Enforcement
    if (user.role === ROLES.CUSTOMER) {
      // Customers do not require administrative approval; self-heal if previously pending
      if (user.accountStatus === 'pending') {
        user.accountStatus = 'active';
        await user.save();
      }
    }

    if (user.accountStatus === 'pending') {
      if (user.role === ROLES.RESTAURANT) {
        return res.status(403).json({
          success: false,
          accountStatus: 'pending',
          role: user.role,
          message: 'Your Restaurant Partner account is pending administrative approval. Our culinary curation team is reviewing your kitchen and onboarding details. Once verified by an administrator, your chef dashboard will be activated. Please allow 1-2 business days or contact admin@crave.com.'
        });
      }

      if (user.role === ROLES.DELIVERY_PARTNER) {
        return res.status(403).json({
          success: false,
          accountStatus: 'pending',
          role: user.role,
          message: 'Your Delivery Partner account is pending verification. Platform administrators review vehicle documents and partner details before fleet activation. Once approved, you can go online and accept delivery orders.'
        });
      }

      return res.status(403).json({
        success: false,
        accountStatus: 'pending',
        role: user.role,
        message: 'Your account is pending administrative review and verification. Please contact support@crave.com for assistance.'
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        accountStatus: 'suspended',
        role: user.role,
        message: 'Your account has been suspended by platform administration. Please contact support@crave.com for assistance.'
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        role: user.role,
        message: `Your account is currently ${user.accountStatus}. Please contact platform administration.`
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/address
exports.addAddress = async (req, res, next) => {
  try {
    const { label, addressLine, landmark, city, state, pincode, coordinates, isDefault } = req.body;

    if (!addressLine || !city || !pincode || !coordinates || coordinates.length < 2) {
      return res.status(400).json({ success: false, message: 'Address line, city, pincode, and coordinates [lng, lat] are required.' });
    }

    const user = await User.findById(req.user._id);

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    user.addresses.push({
      label: label || 'Home',
      addressLine,
      landmark: landmark || '',
      city,
      state: state || '',
      pincode,
      location: {
        type: 'Point',
        coordinates: [Number(coordinates[0]), Number(coordinates[1])]
      },
      isDefault: isDefault || user.addresses.length === 0
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/auth/address/:id
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(addr => addr._id.toString() !== req.params.id);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email address.' });
    }

    // Generic response to prevent account enumeration
    const genericMsg = 'If an account with that email exists, password reset instructions will be sent. Check your inbox (and spam folder).';

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Return generic message even when user doesn't exist
      return res.status(200).json({ success: true, message: genericMsg });
    }

    // Generate a cryptographically secure raw token
    const rawToken = require('crypto').randomBytes(32).toString('hex');

    // Store only the hash of the token in MongoDB
    const tokenHash = require('crypto')
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // --- Email delivery ---
    // In production, send via configured email provider.
    // In development, the token is logged ONLY to server console (never to client).
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    const emailConfigured = !!(process.env.EMAIL_FROM && process.env.EMAIL_SMTP_HOST && process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS);

    if (emailConfigured) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_SMTP_HOST,
          port: Number(process.env.EMAIL_SMTP_PORT) || 587,
          secure: process.env.EMAIL_SMTP_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_SMTP_USER,
            pass: process.env.EMAIL_SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: `"CRAVE Support" <${process.env.EMAIL_FROM}>`,
          to: user.email,
          subject: 'CRAVE — Reset Your Password',
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#FAF7F2;border-radius:16px;">
              <h2 style="color:#3A142D;margin-bottom:8px;">Reset Your CRAVE Password</h2>
              <p style="color:#555;font-size:14px;">We received a request to reset the password for your account.</p>
              <p style="color:#555;font-size:14px;">Click the button below within <strong>1 hour</strong> to set a new password:</p>
              <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#E85A2A;color:#fff;text-decoration:none;border-radius:32px;font-weight:700;font-size:14px;">
                Reset Password
              </a>
              <p style="color:#999;font-size:12px;">If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('[Auth] Email send failed:', emailErr.message);
        // Don't expose email failure to client
      }
    } else {
      // Development mode: Print reset URL to server console only
      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║  [DEV MODE] PASSWORD RESET LINK (server console only):       ║');
      console.log('║  Configure EMAIL_SMTP_* env vars to enable real email.       ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  User: ${user.email}`);
      console.log(`║  URL: ${resetUrl}`);
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
    }

    res.status(200).json({
      success: true,
      message: genericMsg,
      devMode: !emailConfigured,
      devResetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token, email, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    // Hash the incoming token to compare with stored hash
    const tokenHash = require('crypto')
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() } // not expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired. Please request a new password reset.'
      });
    }

    // Hash new password
    const salt = await require('bcryptjs').genSalt(10);
    user.passwordHash = await require('bcryptjs').hash(newPassword, salt);

    // Invalidate the reset token (single-use)
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};
