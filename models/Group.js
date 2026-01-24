const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    category: {
        type: String,
        enum: ['trip', 'home', 'couple', 'friends', 'project', 'event', 'other'],
        default: 'other'
    },
    icon: {
        type: String,
        default: '👥'
    },
    currency: {
        type: String,
        default: 'INR',
        uppercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    simplifyDebts: {
        type: Boolean,
        default: true
    },
    totalExpenses: {
        type: Number,
        default: 0
    },
    settledAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for efficient queries
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ isActive: 1 });

// Method to check if user is member
groupSchema.methods.isMember = function(userId) {
    return this.members.some(member => 
        member.user.toString() === userId.toString() && member.isActive
    );
};

// Method to get active members
groupSchema.methods.getActiveMembers = function() {
    return this.members.filter(member => member.isActive);
};

// Method to add member
groupSchema.methods.addMember = async function(userObj) {
    // Check if user already exists
    const existingMember = this.members.find(
        m => m.user.toString() === userObj.user.toString()
    );
    
    if (existingMember) {
        existingMember.isActive = true;
        existingMember.joinedAt = new Date();
    } else {
        this.members.push(userObj);
    }
    
    return await this.save();
};

// Method to remove member
groupSchema.methods.removeMember = async function(userId) {
    const member = this.members.find(
        m => m.user.toString() === userId.toString()
    );
    
    if (member) {
        member.isActive = false;
    }
    
    return await this.save();
};

// Static method to get user's groups
groupSchema.statics.getUserGroups = async function(userId) {
    return await this.find({
        'members.user': userId,
        'members.isActive': true,
        isActive: true
    }).populate('members.user', 'name email')
      .sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Group', groupSchema);
