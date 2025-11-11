const mongoose = require('mongoose');
const config = require('./config.json');

// Load models
const Account = require('./schemas/account');
const User = require('./schemas/user');
const Project = require('./schemas/project');
const File = require('./schemas/file');
const Usage = require('./schemas/usage');

async function seed() {
  try {
    await mongoose.connect(config.database);
    console.log('✅ Connected to MongoDB');

    // Clear old data
    await Account.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await File.deleteMany({});
    await Usage.deleteMany({});
    console.log('🧹 Cleared existing collections');

    // Create sample account
    const account = await Account.create({
      name: 'PrettySmart Demo Agency',
      huddle_email: 'demo@prettysmart.co',
      plan_id: 'demo_pro_plan',
      isDraft: false,
      created_at: Date.now(),
    });


    // Create sample user
    const user = await User.create({
      first_name: 'Xander',
      last_name: 'Rola',
      email: 'xander@demo.co',
      password: '_prettydum_', // auto-hash handled by schema
      account: account._id,
      role: 'owner',
      created_at: Date.now(),
    });

    // Create projects
    const projects = await Project.insertMany([
      {
        project_title: 'Demo Social Media Post',
        user: user._id,
        account: account._id,
        project_id: 'PRJ001',
        template_id: 'TMP001',
        favorite: true,
        thumbnail_url: 'https://placehold.co/400x300',
      },
      {
        project_title: 'Real Estate Flyer',
        user: user._id,
        account: account._id,
        project_id: 'PRJ002',
        template_id: 'TMP002',
        thumbnail_url: 'https://placehold.co/400x300',
      },
    ]);

    // Create files
    const files = await File.insertMany([
      {
        name: 'demo-image.jpg',
        user: user._id,
        account: account._id,
        ext: 'jpg',
        type: 'image/jpeg',
      },
      {
        name: 'flyer-template.psd',
        user: user._id,
        account: account._id,
        ext: 'psd',
        type: 'application/octet-stream',
      },
    ]);

    // Create usage log
    await Usage.create({
      user: user._id,
      account: account._id,
      row_id: 'USG001',
    });

    console.log('✅ Seed complete');
    console.log(`Account: ${account.huddle_email}`);
    console.log(`User: ${user.email}`);
    console.log(`Projects: ${projects.length}`);
    console.log(`Files: ${files.length}`);
  } catch (err) {
    console.error('❌ Error seeding database:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
