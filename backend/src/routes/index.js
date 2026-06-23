// backend/src/routes/index.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const questionsController = require('../controllers/questions.controller');
const answersController = require('../controllers/answers.controller');
const usersController = require('../controllers/users.controller');
const categoriesController = require('../controllers/categories.controller');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, optionalAuth, authorize, requireVerified } = require('../middleware/auth');

// =============================================
// AUTH ROUTES
// =============================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/verify-email', authController.verifyEmail);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/me', authenticate, authController.getMe);

// =============================================
// QUESTIONS ROUTES
// =============================================
router.get('/questions', optionalAuth, questionsController.getQuestions);
router.get('/questions/trending', questionsController.getTrending);
router.get('/questions/search/similar', questionsController.getSimilarQuestions);
router.get('/questions/:id', optionalAuth, questionsController.getQuestion);
router.post('/questions', authenticate, requireVerified, questionsController.createQuestion);
router.put('/questions/:id', authenticate, questionsController.updateQuestion);
router.delete('/questions/:id', authenticate, questionsController.deleteQuestion);
router.post('/questions/:id/vote', authenticate, questionsController.voteQuestion);
router.post('/questions/:id/bookmark', authenticate, questionsController.bookmarkQuestion);

// =============================================
// ANSWERS ROUTES
// =============================================
router.get('/questions/:questionId/answers', optionalAuth, answersController.getAnswers);
router.post('/questions/:questionId/answers', authenticate, requireVerified, answersController.createAnswer);
router.put('/answers/:id', authenticate, answersController.updateAnswer);
router.delete('/answers/:id', authenticate, answersController.deleteAnswer);
router.post('/answers/:id/accept', authenticate, answersController.acceptAnswer);
router.post('/answers/:id/vote', authenticate, answersController.voteAnswer);
router.post('/answers/:id/validate', authenticate, answersController.validateAnswer);

// =============================================
// CATEGORIES & TAGS ROUTES
// =============================================
router.get('/categories', categoriesController.getCategories);
router.get('/tags', categoriesController.getTags);
router.post('/tags', authenticate, categoriesController.createTag);

// =============================================
// COMMENTS ROUTES
// =============================================
router.get('/comments', optionalAuth, categoriesController.getComments);
router.post('/comments', authenticate, categoriesController.createComment);

// =============================================
// REPORTS ROUTES
// =============================================
router.post('/reports', authenticate, categoriesController.createReport);

// =============================================
// USER ROUTES
// =============================================
router.get('/users/leaderboard', usersController.getLeaderboard);
router.get('/users/:username/profile', optionalAuth, usersController.getUserProfile);
router.put('/users/profile', authenticate, usersController.updateProfile);
router.get('/users/notifications', authenticate, usersController.getNotifications);
router.put('/users/notifications/read', authenticate, usersController.markNotificationsRead);
router.get('/users/bookmarks', authenticate, usersController.getBookmarks);

// =============================================
// ANALYTICS ROUTES
// =============================================
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/heatmap', analyticsController.getCategoryHeatmap);
router.get('/analytics/activity', analyticsController.getActivityTimeline);
router.get('/analytics/knowledge-graph', analyticsController.getKnowledgeGraph);
router.get('/analytics/research-map', analyticsController.getResearchMap);

// =============================================
// ADMIN ROUTES
// =============================================
router.get('/admin/users', authenticate, authorize('admin', 'superadmin'), usersController.adminGetUsers);
router.put('/admin/users/:id/status', authenticate, authorize('admin', 'superadmin'), usersController.adminUpdateUserStatus);
router.get('/admin/reports', authenticate, authorize('admin', 'superadmin'), categoriesController.getReports);

module.exports = router;
