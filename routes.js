const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { isLoggedIn } = require("./middleware");
const { Story, User } = require("./models");

const { fit, transform, find_similar } = require("./tfidf");

const router = express.Router();
const saltRounds = 10;
const SECRET = "secret_key";

router.post("/register", async (req, res) => {
  const { username, password, penName } = req.body;
  const hash = bcrypt.hashSync(password, saltRounds);

  try {
    const user = new User({
      username: username,
      password: hash,
      penName: penName,
    });
    await user.save();
    res.json({ message: "Registered successful" });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user) {
      const result = await bcrypt.compare(password, user.password);
      if (result) {
        const token = await jwt.sign({ username: user.username }, SECRET);
        res.json({ token });
      } else {
        res.status(401).json({ error: "password doest match" });
      }
    } else {
      res.status(401).json({ error: "User doesnt exist" });
    }
  } catch (error) {
    res.status(401).json({ error });
  }
});

router.get("/getUser", isLoggedIn, async (req, res) => {
  const { username } = req.user;

  try {
    const user = await User.findOne({ username: username });
    res.send(user);
  } catch {
    console.error(error);
    res.status(500).send(error);
  }
});

router.post("/createStory", isLoggedIn, async (req, res) => {
  const { username } = req.user;
  const { title, genre, description, visibility, commit_history } = req.body;

  try {
    const story = new Story({
      title,
      genre,
      description,
      visibility,
      username,
      commit_history,
    });
    await story.save();
    res.send(story);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.get("/getAllStories", async (req, res) => {
  try {
    const story = await Story.find({ visibility: true });
    res.send(story);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.get("/getStories", isLoggedIn, async (req, res) => {
  const { username } = req.user;

  try {
    const story = await Story.find({ username: username });
    res.send(story);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.post("/updateStory", isLoggedIn, async (req, res) => {
  const { username } = req.user;
  const { title, content, commitMessage } = req.body;

  try {
    const filter = { title: title, username: username };
    const update = { content: content };

    // const update_doc = await Story.updateOne(filter, [{ $set: update }]);
    const new_commit = {
      commitMessage: commitMessage,
      content: content,
      time: Date.now(),
    };
    Story.findOneAndUpdate(filter, { $push: { commit_history: new_commit } })
      .then((response) => {
        console.log(response);
        res.send("story updated successfully");
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.post("/deleteStory", isLoggedIn, async (req, res) => {
  const { username } = req.user;
  const { title } = req.body;

  try {
    const filter = { title: title, username: username };
    const updated_doc = await Story.deleteOne(filter);
    res.send("story deleted successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.post("/getSimilarStories", async (req, res) => {
  const { searchWord, top_n } = req.body;

  try {
    const stories = await Story.find({ visibility: true });
    const descriptions = stories.map((story) => story.description);
    descriptions.push(searchWord);
    var result = fit(descriptions);
    var sparse_matrix = transform(descriptions, result.vocab, result.idfs_);

    const sorted_similarity_scores = find_similar(sparse_matrix).slice(
      0,
      top_n
    );

    const indexes = sorted_similarity_scores.map((element) => element[1]);

    var similar_stores = [];
    for (let i = 0; i < indexes.length; i++) {
      similar_stores.push(stories[indexes[i]]);
    }
    res.send(similar_stores);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

router.get("/test", async (req, res) => {
  let corpus = [
    "this is the first document",
    "this document is the second document",
    "and this is the third one",
    "is this the first document",
  ];
  var result = fit(corpus);
  var sparse_matrix = transform(corpus, result.vocab, result.idfs_);
  console.log(sparse_matrix);
  res.send("Ran");
});

module.exports = router;
