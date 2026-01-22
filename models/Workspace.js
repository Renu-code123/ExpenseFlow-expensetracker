const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['admin', 'editor', 'viewer'],
            default: 'viewer'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    settings: {
        currency: {
            type: String,
            default: 'INR'
        },
        allowMemberInvites: {
            type: Boolean,
            default: false
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Middleware to ensure owner is always an admin member
workspaceSchema.pre('save', function (next) {
    const isOwnerMember = this.members.find(m => m.user.toString() === this.owner.toString());
    if (!isOwnerMember) {
        this.members.push({
            user: this.owner,
            role: 'admin',
            joinedAt: new Date()
        });
    }
    next();
});

module.exports = mongoose.model('Workspace', workspaceSchema);
