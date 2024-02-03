let corpus = [
  "this is the first document",
  "this document is the second document",
  "and this is the third one",
  "is this the first document",
];

function idf(corpus, unique_words) {
  // log(total number of documents in text corpus / number of documents containing w)
  var idf_values = {};
  const total_docs = corpus.length;

  for (word_index in unique_words) {
    let cnt = 0;
    for (row_index in corpus) {
      if (corpus[row_index].split(" ").includes(unique_words[word_index])) {
        cnt++;
      }
    }
    idf_values[unique_words[word_index]] =
      1 + Math.log((1 + total_docs) / (1 + cnt));
  }

  return idf_values;
}

function fit(dataset) {
  var unique_words = new Set();
  for (row_index in dataset) {
    const words = dataset[row_index].split(" ");
    for (word_index in words) {
      if (words[word_index].length < 2) {
        continue;
      }
      unique_words.add(words[word_index]);
    }
  }
  const unique_words_array = Array.from(unique_words);
  unique_words_array.sort();
  var vocab = {};
  for (let i = 0; i < unique_words_array.length; i++) {
    vocab[unique_words_array[i]] = i;
  }

  const idfs_ = idf(dataset, unique_words_array);
  return { vocab: vocab, idfs_: idfs_ };
}

function Counter(words) {
  var word_counter = {};
  for (word_index in words) {
    if (words[word_index] in word_counter) {
      word_counter[words[word_index]] += 1;
    } else {
      word_counter[words[word_index]] = 1;
    }
  }

  return word_counter;
}

function transform(dataset, features, ifds_) {
  const sparse_matrix = [];

  for (row_index in dataset) {
    const words = dataset[row_index].split(" ");
    var word_count = Counter(words);
    const row = new Array(Object.keys(features).length).fill(0);
    for (word_index in words) {
      if (words[word_index] in features) {
        const tf = word_count[words[word_index]] / words.length;
        const tfidf = tf * ifds_[words[word_index]];
        row[features[words[word_index]]] = tfidf;
      }
    }
    sparse_matrix.push(row);
  }

  return sparse_matrix;
}

function cosinesim(A, B) {
  var dotproduct = 0;
  var mA = 0;
  var mB = 0;

  for (var i = 0; i < A.length; i++) {
    dotproduct += A[i] * B[i];
    mA += A[i] * A[i];
    mB += B[i] * B[i];
  }

  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  var similarity = dotproduct / (mA * mB);

  return similarity;
}

function find_similar(sparse_matrix) {
  var new_vector = sparse_matrix[sparse_matrix.length - 1];
  var similarity_scores = [];
  for (var index = 0; index < sparse_matrix.length - 1; index++) {
    const sim = cosinesim(sparse_matrix[index], new_vector);
    similarity_scores.push([sim, index]);
  }
  var sorted_similarity_scores = similarity_scores.sort(function (a, b) {
    return b[0] - a[0];
  });

  return sorted_similarity_scores;
}

module.exports = { fit, transform, find_similar };
