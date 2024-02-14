const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const { isLoggedIn } = require("./middleware");
const { Story, User } = require("./models");

const { fit, transform, find_similar } = require("./tfidf");

const router = express.Router();
const saltRounds = 10;
const SECRET = "secret_key";

function sortByFrequency(array) {
  var frequency = {};

  array.forEach(function (value) {
    frequency[value] = 0;
  });

  var uniques = array.filter(function (value) {
    return ++frequency[value] == 1;
  });

  return uniques.sort(function (a, b) {
    return frequency[b] - frequency[a];
  });
}

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

router.get("/isloggedIn", isLoggedIn, async (req, res) => {
  try {
    res.send("logged in");
  } catch {
    console.error(error);
    res.status(500).send(error);
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

router.get("/getUserGenre", isLoggedIn, async (req, res) => {
  const { username } = req.user;

  try {
    const stories = await Story.find({ username: username });
    const genres = stories.map((story) => story.genre.toLowerCase());
    const sorted_genres = sortByFrequency(genres);
    res.send(sorted_genres.slice(0, 5));
  } catch {
    console.error(error);
    res.status(500).send(error);
  }
});

router.get("/getPopularUserStories", isLoggedIn, async (req, res) => {
  const { username } = req.user;

  try {
    const stories = await Story.find({ username: username });
    const sortedStories = stories.sort(function (a, b) {
      return b.forkCount - a.forkCount;
    });
    const titles = sortedStories.slice(0, 5).map((story) => story.title);
    res.send(titles);
  } catch {
    console.error(error);
    res.status(500).send(error);
  }
});

router.post("/createStory", isLoggedIn, async (req, res) => {
  const { username } = req.user;
  const { title, genre, description, visibility, commit_history, forkedFrom } =
    req.body;

  try {
    const story = new Story({
      title,
      genre,
      description,
      visibility,
      username,
      commit_history,
      forkedFrom,
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
    const window = new JSDOM("").window;
    const DOMPurify = createDOMPurify(window);
    const clean = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });

    const filter = { title: title, username: username };
    // const update = { content: clean };
    // const update_doc = await Story.updateOne(filter, [{ $set: update }]);

    const new_commit = {
      commitMessage: commitMessage,
      content: clean,
      time: Date.now(),
    };
    Story.findOneAndUpdate(filter, { $push: { commit_history: new_commit } })
      .then((response) => {
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

router.post("/incrementForkCounter", isLoggedIn, async (req, res) => {
  const { title, username } = req.body;
  try {
    const filter = { username: username, title: title };
    Story.findOneAndUpdate(filter, { $inc: { forkCount: 1 } })
      .then((response) => {
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
