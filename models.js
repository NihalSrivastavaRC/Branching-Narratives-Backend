const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  genre: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  visibility: {
    type: Boolean,
    required: true,
  },
  commit_history: {
    type: [
      {
        commitMessage: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        time: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    required: false,
  },
  username: {
    type: String,
    required: true,
  },
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  penName: {
    type: String,
    required: false,
  },
});

const Story = mongoose.model("Story", StorySchema);
const User = mongoose.model("User", UserSchema);

module.exports = { Story, User };
