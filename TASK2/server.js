const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/social_media_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// User Model
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: ''
    },
    profilePic: {
        type: String,
        default: 'https://via.placeholder.com/150'
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.model('User', UserSchema);

// Post Model
const PostSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Post = mongoose.model('Post', PostSchema);

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const user = await User.findById(decoded.id);
        
        if (!user) {
            throw new Error();
        }
        
        req.token = token;
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Please authenticate' });
    }
};

// Routes

// Register a new user
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        user = new User({
            username,
            email,
            password,
            fullName
        });
        
        await user.save();
        
        // Create JWT token
        const token = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '1d' });
        
        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                profilePic: user.profilePic,
                bio: user.bio,
                followers: user.followers.length,
                following: user.following.length
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login user
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Create JWT token
        const token = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '1d' });
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                profilePic: user.profilePic,
                bio: user.bio,
                followers: user.followers.length,
                following: user.following.length
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get current user
app.get('/api/users/me', auth, (req, res) => {
    res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName,
        profilePic: req.user.profilePic,
        bio: req.user.bio,
        followers: req.user.followers.length,
        following: req.user.following.length
    });
});

// Update user profile
app.put('/api/users/me', auth, async (req, res) => {
    try {
        const { fullName, bio, profilePic } = req.body;
        
        // Update fields
        if (fullName) req.user.fullName = fullName;
        if (bio) req.user.bio = bio;
        if (profilePic) req.user.profilePic = profilePic;
        
        await req.user.save();
        
        res.json({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            fullName: req.user.fullName,
            profilePic: req.user.profilePic,
            bio: req.user.bio,
            followers: req.user.followers.length,
            following: req.user.following.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            profilePic: user.profilePic,
            bio: user.bio,
            followers: user.followers.length,
            following: user.following.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Follow a user
app.post('/api/users/:id/follow', auth, async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if already following
        if (req.user.following.includes(user.id)) {
            return res.status(400).json({ message: 'Already following this user' });
        }
        
        // Add to following
        req.user.following.push(user.id);
        await req.user.save();
        
        // Add to user's followers
        user.followers.push(req.user.id);
        await user.save();
        
        res.json({ message: 'Successfully followed user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Unfollow a user
app.post('/api/users/:id/unfollow', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if following
        if (!req.user.following.includes(user.id)) {
            return res.status(400).json({ message: 'Not following this user' });
        }
        
        // Remove from following
        req.user.following = req.user.following.filter(id => id.toString() !== user.id.toString());
        await req.user.save();
        
        // Remove from user's followers
        user.followers = user.followers.filter(id => id.toString() !== req.user.id.toString());
        await user.save();
        
        res.json({ message: 'Successfully unfollowed user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get suggested users
app.get('/api/users/suggested', auth, async (req, res) => {
    try {
        // Find users not followed by current user
        const users = await User.find({
            _id: { 
                $nin: [...req.user.following, req.user.id] 
            }
        }).limit(5);
        
        const suggestedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            profilePic: user.profilePic,
            // In a real app, you would calculate mutual connections here
            mutualFriends: Math.floor(Math.random() * 10)
        }));
        
        res.json(suggestedUsers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a post
app.post('/api/posts', auth, async (req, res) => {
    try {
        const { content } = req.body;
        
        const post = new Post({
            author: req.user.id,
            content
        });
        
        await post.save();
        
        // Populate author info
        await post.populate('author', 'id username fullName profilePic').execPopulate();
        
        res.status(201).json({
            id: post.id,
            author: {
                id: post.author.id,
                username: post.author.username,
                fullName: post.author.fullName,
                profilePic: post.author.profilePic
            },
            content: post.content,
            likes: [],
            comments: [],
            createdAt: post.createdAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get feed posts
app.get('/api/posts', auth, async (req, res) => {
    try {
        // Get posts from users that the current user follows and their own posts
        const posts = await Post.find({
            $or: [
                { author: { $in: req.user.following } },
                { author: req.user.id }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('author', 'id username fullName profilePic')
        .populate('comments.author', 'id username fullName profilePic');
        
        const formattedPosts = posts.map(post => ({
            id: post.id,
            author: {
                id: post.author.id,
                username: post.author.username,
                fullName: post.author.fullName,
                profilePic: post.author.profilePic
            },
            content: post.content,
            likes: post.likes.length,
            liked: post.likes.includes(req.user.id),
            comments: post.comments.map(comment => ({
                id: comment.id,
                author: {
                    id: comment.author.id,
                    username: comment.author.username,
                    fullName: comment.author.fullName,
                    profilePic: comment.author.profilePic
                },
                content: comment.content,
                timestamp: comment.createdAt
            })),
            timestamp: post.createdAt
        }));
        
        res.json(formattedPosts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a single post
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'id username fullName profilePic')
            .populate('comments.author', 'id username fullName profilePic');
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if user is authenticated to determine if they liked the post
        let liked = false;
        if (req.header('Authorization')) {
            try {
                const token = req.header('Authorization').replace('Bearer ', '');
                const decoded = jwt.verify(token, 'your_jwt_secret');
                const user = await User.findById(decoded.id);
                
                if (user) {
                    liked = post.likes.includes(user.id);
                }
            } catch (err) {
                // Ignore auth errors - just don't set liked
            }
        }
        
        res.json({
            id: post.id,
            author: {
                id: post.author.id,
                username: post.author.username,
                fullName: post.author.fullName,
                profilePic: post.author.profilePic
            },
            content: post.content,
            likes: post.likes.length,
            liked,
            comments: post.comments.map(comment => ({
                id: comment.id,
                author: {
                    id: comment.author.id,
                    username: comment.author.username,
                    fullName: comment.author.fullName,
                    profilePic: comment.author.profilePic
                },
                content: comment.content,
                timestamp: comment.createdAt
            })),
            timestamp: post.createdAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Like a post
app.post('/api/posts/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if already liked
        if (post.likes.includes(req.user.id)) {
            return res.status(400).json({ message: 'Post already liked' });
        }
        
        // Add like
        post.likes.push(req.user.id);
        await post.save();
        
        res.json({ message: 'Post liked successfully', likes: post.likes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Unlike a post
app.post('/api/posts/:id/unlike', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if liked
        if (!post.likes.includes(req.user.id)) {
            return res.status(400).json({ message: 'Post not liked yet' });
        }
        
        // Remove like
        post.likes = post.likes.filter(id => id.toString() !== req.user.id.toString());
        await post.save();
        
        res.json({ message: 'Post unliked successfully', likes: post.likes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add comment to a post
app.post('/api/posts/:id/comment', auth, async (req, res) => {
    try {
        const { content } = req.body;
        
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Add comment
        post.comments.push({
            author: req.user.id,
            content
        });
        
        await post.save();
        
        // Get the newly added comment
        const newComment = post.comments[post.comments.length - 1];
        
        // Populate author info
        await User.populate(newComment, { path: 'author', select: 'id username fullName profilePic' });
        
        res.status(201).json({
            id: newComment.id,
            author: {
                id: newComment.author.id,
                username: newComment.author.username,
                fullName: newComment.author.fullName,
                profilePic: newComment.author.profilePic
            },
            content: newComment.content,
            timestamp: newComment.createdAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a post
app.delete('/api/posts/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if user is the author
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to delete this post' });
        }
        
        await post.remove();
        
        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});