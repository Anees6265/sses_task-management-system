const express = require('express');
const router = express.Router();
const {
  getTemplates,
  createTemplate,
  deleteTemplate,
  instantiateTemplate
} = require('../controllers/taskTemplateController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getTemplates)
  .post(createTemplate);

router.route('/:id')
  .delete(deleteTemplate);

router.post('/:id/instantiate', instantiateTemplate);

module.exports = router;
