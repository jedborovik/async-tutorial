/*
Generator control flow.

Add () after any of the outer functions to run the example.

To be able to run the examples run node with the --harmony flag.
*/

/*
Intro to generator functions and generator objects.
*/
!function() {
  function *genFn() {
    yield 1;
    yield 2;
    yield 3;
  }

  var gen = genFn();

  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
}

/*
Generator function step 2: arguments and return values.
*/
!function() {
  function *genFn(x) {
    console.log('starting');
    yield 1;
    yield 2;
    console.log('x is', x);
    yield 3;
    return 100;
  }

  var gen = genFn(2.5);

  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
}

/*
Generate function step 3: sending values out with `yield` and in with `gen.next`

Sending values back into the generator function is the key functionality
that will let us write our control flow library later.
*/
!function() {
  function *genFn() {
    var incoming = yield 'outgoing';
    console.log(incoming);
  }

  var gen = genFn();

  console.log(gen.next('incoming 1'));
  console.log(gen.next('incoming 2'));
  console.log(gen.next('incoming 3'));
}

/*
We haven't implemented `run` yet, but here's what we want:
*/
!function() {
  run(function *() {
    var clue1 = yield readFile('clue1.txt');
    var clue2 = yield readFile(clue1.trim());
    var treasure = yield readFile(clue2.trim());
    console.log(treasure);
  });
}

/*
Run `$ echo 'clue2.txt' > clue1.txt ; echo 'treasure.txt' > clue2.txt; echo '$$$' > treasure.txt` before running following examples.
*/

/*
Naive implementation that only works if we want to
read clue1.txt, clue2.txt, and treasure.txt
*/
!function() {
  var fs = require('fs');

  function readFile(filename) {
    return function(callback) {
      fs.readFile(filename, 'utf8', callback);
    }
  }

  run(function *() {
    var clue1 = yield readFile('clue1.txt');
    var clue2 = yield readFile(clue1.trim());
    var treasure = yield readFile(clue2.trim());
    console.log('YAY TREASURE', treasure);
  })

  function run(genFn) {
    var gen = genFn();

    var obj1 = gen.next();
    obj1.value(function(err, result) {
      var obj2 = gen.next(result);
      obj2.value(function(err, result2) {
        var obj3 = gen.next(result2);
        obj3.value(function(err, result3) {
          gen.next(result3);
        })
      })
    })
  }
}

/*
Here's the recursive, general solution for what we had above.
The key idea is being able to send the read file contents
into the generator function passed to `run` by using `gen.next`.
*/
!function() {
  var fs = require('fs');

  run(function *() {
    var clue1 = yield readFile('clue1.txt');
    var clue2 = yield readFile(clue1.trim());
    var treasure = yield readFile(clue2.trim());
    console.log(treasure);
  });

  function readFile(file) {
    return function(callback) {
      fs.readFile(file, 'utf8', callback);
    }
  }

  function run(fn) {
    var gen = fn();

    next();
    function next(incoming) {
      var ret = gen.next(incoming);
      if (ret.done) return;
      ret.value(function(err, result) {
        if (err) gen.throw(err);
        next(result);
      });
    }
  }
}

/*
Our goal is now to be able to yield an array and handle each
asynchronous operation in parallel. The example below will let us
handle each `readFile`, but it doesn't pass the result back to the
function inside of `run`.
*/
!function() {
  var fs = require('fs');

  function readFile(filename) {
    return function(callback) {
      fs.readFile(filename, 'utf8', callback);
    }
  }

  run(function *() {
    var gens = [readFile('clue1.txt'), readFile('clue2.txt'), readFile('treasure.txt')];
    var contents = yield gens;
    console.log(contents);
  });

  function toThunk(val) {
    if (val && 'function' == typeof val) {
      return val;
    }
    if (Array.isArray(val)) {
      return arrayToThunk(val);
    }
    throw Error('We only support functions and arrays');
  }

  function arrayToThunk(arr) {
    return function(done) {
      var res = new Array(arr.length);

      for (var i = 0; i < arr.length; i++) {
        resolve(arr[i], i);
      }

      function resolve(thunk, index) {
        thunk(function(err, result) {
          if (err) throw err;
          res[index] = result;
          console.log('received', result);
        })
      }
    }
  }

  function run(genFn) {
    var gen = genFn();

    next();
    function next(incoming) {
      var ret = gen.next(incoming);
      if (ret.done) return;
      ret.value = toThunk(ret.value);
      ret.value(function(err, result) {
        if (err) gen.throw(err);
        next(result);
      });
    }

  }
}

/*
This example improves `arrayToThunk` by keeping track of pending
operations from the array. Now when all the asynchronous calls
have finished their results are passed back to into the generator
function inside of `run`. Log statements are included to show that
`fs.readFile` is called for each file that needs to be read before
results start coming back. That is, it doesn't read one file, then
wait for a response before reading the next file.
*/
!function() {
  var fs = require('fs');

  run(function *() {
    var gens = [read('clue1.txt'), read('clue2.txt'), read('treasure.txt')]
    var files = yield gens;
    console.log(files);
  });

  function read(file) {
    return function(callback) {
      console.log('about to read', file);
      fs.readFile(file, 'utf8', callback);
    }
  }

  function run(genFn) {
    var gen = genFn();

    next();
    function next(incoming) {
      var ret = gen.next(incoming);
      if (ret.done) return;
      ret.value = toThunk(ret.value);
      ret.value(function(err, result) {
        if (err) gen.throw(err);
        next(result);
      });
    }
  }

  function toThunk(obj) {
    if ('function' == typeof obj) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return arrayToThunk(obj);
    }
    throw Error('We are only thunking arrays and functions');
  }

  function arrayToThunk(arr) {
    return function(done) {
      var pending = arr.length;
      var results = new Array(arr.length);

      for (var i = 0; i < arr.length; i++) {
        resolve(arr[i], i);
      }

      function resolve(thunk, index) {
        thunk(function(err, res) {
          console.log('done reading file');
          if (err) return done(err);
          results[index] = res;
          --pending || done(null, results);
        });
      }
    }
  }
}

/*
We can also yield generator functions with `yield*`.
Compare the results with `yield innerGen()`.
*/
!function() {
  function *genFn() {
    yield 1;
    yield 2;
    yield* innerGen();
    yield 3;
  }

  function *innerGen() {
    yield 2.2;
    yield 2.4;
    yield 2.6;
    yield 2.8;
  }

  var gen = genFn();

  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
  console.log(gen.next());
}

/*
Using `yield*` we can now take advantage of generator based
control flow recursively. Functions called within the generator
function inside of `run` can also use `yield` to await the result
from an asynchronous call.

The following shows an example of this.
*/
!function() {
  var fs = require('fs');

  run(function *() {
    var fileSum = yield* sizes('clue1.txt', 'clue2.txt', 'treasure.txt');
    console.log(fileSum);
  });

  function *sizes(/* files */) {
    var files = Array.prototype.slice.call(arguments);
    var thunks = files.map(function(file) {
      return size(file);
    });
    var results = yield thunks;
    return sum(results);
  }

  function sum(arr) {
    return arr.reduce(function(acc, x) {
      return acc + x;
    });
  }

  function size(file) {
    return function(done) {
      fs.stat(file, function(err, result) {
        if (err) return done(err, null);
        done(null, result.size);
      });
    }
  }

  function read(file) {
    return function(callback) {
      fs.readFile(file, 'utf8', callback);
    }
  }

  function run(genFn) {
    var gen = genFn();

    next();
    function next(incoming) {
      var ret = gen.next(incoming);
      if (ret.done) return;
      ret.value = toThunk(ret.value);
      ret.value(function(err, result) {
        if (err) gen.throw(err);
        next(result);
      });
    }
  }

  function toThunk(obj) {
    if ('function' == typeof obj) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return arrayToThunk(obj);
    }
    throw Error('We are only thunking arrays and functions');
  }

  function arrayToThunk(arr) {
    return function(done) {
      var pending = arr.length;
      var results = new Array(arr.length);

      for (var i = 0; i < arr.length; i++) {
        resolve(arr[i], i);
      }

      function resolve(thunk, index) {
        thunk(function(err, res) {
          if (err) return done(err);
          results[index] = res;
          --pending || done(null, results);
        });
      }
    }
  }
}

/*
Everyone lived happily ever after. The end.

For more info check out the inspiration for this talk:
- https://github.com/tj/co
- https://github.com/tj/node-thunkify
*/
