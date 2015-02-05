/*
Promises.

Add () after any of the outer functions to run the example.
*/

/*
Hello world callback example.

`$ echo 'This is text' > text.txt` before running example.
*/
!function() {
  var fs = require('fs');

  fs.readFile('text.txt', 'utf8', function(err, res) {
    console.log(res);
  });
}

/*
Let's now wrap fs.readFile in our own function so we can have a little 
more control over it (for example always have encoding equal 'utf8').
*/
!function() {
  var fs = require('fs');

  function readFile(file, callback) {
    fs.readFile(file, 'utf8', callback);
  }

  readFile('text.txt', function(err, res) {
    console.log(res);
  });
}

/*
Now let's change readFile so we can call it with the file we want
to read, and then add a callback function later.
*/
!function() {
  var fs = require('fs');

  function readFile(file) {
    var callback;
    fs.readFile(file, 'utf8', function(err, res) {
      callback(err, res);
    });
    return {
      setCallback: function(_callback) {
        callback = _callback;
      }
    }
  }

  readFile('text.txt').setCallback(function(err, res) {
    if (err) throw err;
    console.log(res);
  });
}

/*
Right now our ability to defer setting the callback to later is completely 
tied to our implementation of readFile. Let's start to tease it apart so
when we want to add similar functionality to a different function, we can.
*/
!function() {
  var fs = require('fs');

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.callCallbackWith(err, res);
    });
    return promise;
  }

  readFile('text.txt').setCallback(function(err, res) {
    if (err) throw err;
    console.log(res);
  });
}

/*
Above we introduced a new method `callCallbackWith`. Let's update our promise
object (the one that's returned from `createPromise`) to have this method.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback;
    var promise = {
      setCallback: function(_callback) {
        callback = _callback;
      },
      callCallbackWith: function(err, res) {
        callback(err, res);
      }
    };

    return promise;
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.callCallbackWith(err, res);
    });
    return promise;
  }

  readFile('text.txt').setCallback(function(err, res) {
    if (err) throw err;
    console.log(res);
  });
}

/*
One reason people enjoy using promises is because you can chain them. That is,
you can have something that looks like this:
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback;
    var promise = {
      setCallback: function(_callback) {
        callback = _callback;
      },
      callCallbackWith: function(err, res) {
        callback(err, res);
      }
    };

    return promise;
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.callCallbackWith(err, res);
    });
    return promise;
  }

  readFile('text.txt').setCallback(function(err, res) {
    if (err) throw err;
    console.log(res);
    return 'hello from callback 1';
  }).setCallback(function(err, res) {
    if (err) throw err;
    console.log(res);
  });
}

/*
Not suprisingly, this fails because setCallback doesn't return anything. Let's make
some changes to `promise.setCallback` so that it does.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback;
    var promise = {
      setCallback: function(_callback) {
        var nextPromise = createPromise();
        callback = function(_err, _res) {
          var err, res;
          try {
            res = _callback(_err, _res);
          } catch (e) {
            err = e;
          } 
          nextPromise.callCallbackWith(err, res);
        }
        return nextPromise;
      },
      callCallbackWith: function(err, res) {
        if (!callback) return;
        callback(err, res);
      }
    };

    return promise;
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.callCallbackWith(err, res);
    });
    return promise;
  }

  readFile('text.txt').setCallback(function first(err, res) {
    if (err) throw err;
    console.log(res);
    return 'hello from callback 1';
  }).setCallback(function second(err, res) {
    if (err) throw err;
    console.log(res);
  });
}

/*
Once this works, let's double check to make sure our error handling works.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback;
    var promise = {
      setCallback: function(_callback) {
        var nextPromise = createPromise();
        callback = function(_err, _res) {
          var err, res;
          try {
            res = _callback(_err, _res);
          } catch (e) {
            err = e;
          } 
          nextPromise.callCallbackWith(err, res);
        }
        return nextPromise;
      },
      callCallbackWith: function(err, res) {
        if (!callback) return;
        callback(err, res);
      }
    };

    return promise;
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.callCallbackWith(err, res);
    });
    return promise;
  }

  readFile('file-does-not-exist.txt').setCallback(function first(err, res) {
    if (err) throw err;
    console.log(res);
    return 'hello from callback 1';
  }).setCallback(function second(err, res) {
    if (err) {
      console.log('Handling error:', err.message);
      return;
    }
    console.log(res);
  });
}

/*
What we have is great so far, but it hasn't really helped us too much on war on 
callback hell. The question is how do we express something like this with our 
promises?

`$ echo 'clue2.txt' > clue1; echo 'treasure.txt' > clue2.txt; echo '$$$' > treasure.txt` before running following examples.
*/
!function() {
  var fs = require('fs');

  fs.readFile('clue1.txt', 'utf8', function(err, clue1) {
    if (err) throw err;
    fs.readFile(clue1.trim(), 'utf8', function(err, clue2) {
      if (err) throw err;
      fs.readFile(clue2.trim(), 'utf8', function(err, treasure) {
        if (err) throw err;
        console.log(treasure);
      });
    });
  });
}

/*
Right now if we try to return promises in our chain of callbacks, it doesn't work as intented.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback;
    var promise = {
      setCallback: function(_callback) {
        var nextPromise = createPromise();
        callback = function(_err, _res) {
          var err, res;
          try {
            res = _callback(_err, _res);
          } catch (e) {
            err = e;
          } 
          nextPromise.callCallbackWith(err, res);
        }
        return nextPromise;
      },
      callCallbackWith: function(err, res) {
        if (!callback) return;
        callback(err, res);
      }
    };

    return promise;
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.callCallbackWith(err, res);
    });
    return promise;
  }

  readFile('clue1.txt').setCallback(function(err, clue1) {
    if (err) throw err;
    var file = clue1.trim();
    return readFile(file);
  }).setCallback(function(err, clue2) {
    if (err) throw err;
    var file = clue2.trim();
    return readFile(file);
  }).setCallback(function(err, treasure) {
    if (err) {
      console.log('error --', err.message, '-- prevented us from getting the treasure.');
      return;
    }
    console.log(treasure);
  });
}

/*
The problem is that the return value (`res`) from _callback is sometimes a value we care
about and sometimes it's a promise that whose resolved value is what we care about. Let's add
a `resolve` function that will handle the case when `res` is either the value we care
about or a promise.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback;
    var promise = {
      setCallback: function(_callback) {
        var nextPromise = createPromise();
        callback = function(_err, _res) {
          var res;
          try {
            res = _callback(_err, _res);
          } catch (err) {
            nextPromise.callCallbackWith(err, null);
            return;
          } 
          resolve(nextPromise, res);
        }
        return nextPromise;
      },
      callCallbackWith: function(err, res) {
        if (!callback) return;
        callback(err, res);
      }
    };

    return promise;
  }

  function resolve(promise, value) {
    if (value && 'function' == typeof value.setCallback) {
      value.setCallback(function(err, res) {
        promise.callCallbackWith(err, res);
      });
      return
    }

    promise.callCallbackWith(null, value);
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.callCallbackWith(err, res);
    });
    return promise;
  }

  readFile('clue1.txt').setCallback(function(err, clue1) {
    if (err) throw err;
    var file = clue1.trim();
    return readFile(file);
  }).setCallback(function(err, clue2) {
    if (err) throw err;
    var file = clue2.trim();
    return readFile(file);
  }).setCallback(function(err, treasure) {
    if (err) {
      console.log('error --', err.message, '-- prevented us from getting the treasure.');
      return;
    }
    console.log(treasure);
  });
}

/*
Let's start to transition to the standard promise API. Namely setCallback -> then, callCallbackWith -> resolve. 
We already have a `resolve` function, so let's capitalize that to avoid the conflict.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback;
    var promise = {
      then: function(_callback) {
        var nextPromise = createPromise();
        callback = function(_err, _res) {
          var res;
          try {
            res = _callback(_err, _res);
          } catch (err) {
            nextPromise.resolve(err, null);
            return;
          } 
          Resolve(nextPromise, res);
        }
        return nextPromise;
      },
      resolve: function(err, res) {
        if (!callback) return;
        callback(err, res);
      }
    };

    return promise;
  }

  function Resolve(promise, value) {
    if (value && 'function' == typeof value.then) {
      value.then(function(err, res) {
        promise.resolve(err, res);
      });
      return
    }

    promise.resolve(null, value);
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.resolve(err, res);
    });
    return promise;
  }

  readFile('clue1.txt').then(function(err, clue1) {
    if (err) throw err;
    var file = clue1.trim();
    return readFile(file);
  }).then(function(err, clue2) {
    if (err) throw err;
    var file = clue2.trim();
    return readFile(file);
  }).then(function(err, treasure) {
    if (err) {
      console.log('error --', err.message, '-- prevented us from getting the treasure.');
      return;
    }
    console.log(treasure);
  });
}
/*
Ok good that seems to still work.
*/

/*
Another difference between what we have and what you'll often see with promises:
our `then` (formerly `setCallback`) takes a single function that handles an
error and a result. Normally you'll see two functions. One for handling the 
error, one for handling the result.

Let's change our API to look like that.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback, errback;
    var promise = {
      // now we have to change everywhere we have `then`
      then: function(_callback, _errback) {
        var nextPromise = createPromise();
        callback = function(_res) {
          var res;
          try {
            res = _callback(_res);
          } catch (err) {
            nextPromise.resolve(err, null);
            return;
          } 
          Resolve(nextPromise, res);
        }
        errback = _errback;
        return nextPromise;
      },
      resolve: function(err, res) {
        if (err && errback) return errback(err);
        if (callback) callback(res);
      }
    };

    return promise;
  }

  function Resolve(promise, value) {
    if (value && 'function' == typeof value.then) {
      value.then(function(res) {
        promise.resolve(null, res);
      }, function(err) {
        promise.resolve(err, null);
      });
      return
    }

    promise.resolve(null, value);
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.resolve(err, res);
    });
    return promise;
  }

  readFile('clue1.txt').then(function(clue1) {
    var file = clue1.trim();
    return readFile(file);
  }).then(function(clue2) {
    var file = clue2.trim();
    return readFile(file);
  }).then(function(treasure) {
    console.log(treasure);
  });
}

/*
One thing we didn't check was how it handles errors. We removed our error handling
so now let's add it back in.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback, errback;
    var promise = {
      then: function(_callback, _errback) {
        var nextPromise = createPromise();
        callback = function(_res) {
          var res;
          try {
            res = _callback(_res);
          } catch (err) {
            nextPromise.resolve(err, null);
            return;
          } 
          Resolve(nextPromise, res);
        }
        errback = _errback;
        return nextPromise;
      },
      resolve: function(err, res) {
        if (err && errback) return errback(err);
        if (callback) callback(res);
      }
    };

    return promise;
  }

  function Resolve(promise, value) {
    if (value && 'function' == typeof value.then) {
      value.then(function(res) {
        promise.resolve(null, res);
      }, function(err) {
        promise.resolve(err, null);
      });
      return;
    }

    promise.resolve(null, value);
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.resolve(err, res);
    });
    return promise;
  }

  readFile('clue1.txt').then(function(clue1) {
    throw Error('Oh no!');
    var file = clue1.trim();
    return readFile(file);
  }, function(err) {
    throw err;
  }).then(function(clue2) {
    var file = clue2.trim();
    return readFile(file);
  }, function(err) {
    throw (err);
  }).then(function(treasure) {
    console.log(treasure);
  }, function(err) {
    console.log('error --', err.message, '-- prevented us from the treasure');
  });
}

/*
This didn't handle the error correctly. We weren't able to handle it at the 
end of the promise chain. Lets change how we setup `errback`.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback, errback;
    var promise = {
      then: function(_callback, _errback) {
        var nextPromise = createPromise();
        callback = function(_res) {
          var res;
          try {
            res = _callback(_res);
          } catch (err) {
            nextPromise.resolve(err, null);
            return;
          } 
          Resolve(nextPromise, res);
        };
        errback = function(_err) {
          try {
            _errback(_err);
          } catch(err) {
            nextPromise.resolve(err, null);
          }
        };
        return nextPromise;
      },
      resolve: function(err, res) {
        if (err && errback) return errback(err);
        if (callback) callback(res);
      }
    };

    return promise;
  }

  function Resolve(promise, value) {
    if (value && 'function' == typeof value.then) {
      value.then(function(res) {
        promise.resolve(null, res);
      }, function(err) {
        promise.resolve(err, null);
      });
      return;
    }

    promise.resolve(null, value);
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.resolve(err, res);
    });
    return promise;
  }

  readFile('clue1.txt').then(function(clue1) {
    throw Error('Oh no!');
    var file = clue1.trim();
    return readFile(file);
  }, function(err) {
    throw err;
  }).then(function(clue2) {
    var file = clue2.trim();
    return readFile(file);
  }, function(err) {
    throw (err);
  }).then(function(treasure) {
    console.log(treasure);
  }, function(err) {
    console.log('error --', err.message, '-- prevented us from the treasure');
  });
}

/*
Our error handlers early on don't seem to be doing much. It'd be nice if propogating 
the error was the default. Let's change our code to add a default _errback function.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback, errback;
    var promise = {
      then: function(_callback, _errback) {
        var nextPromise = createPromise();
        callback = function(_res) {
          var res;
          try {
            res = _callback(_res);
          } catch (err) {
            nextPromise.resolve(err, null);
            return;
          } 
          Resolve(nextPromise, res);
        };
        _errback = _errback || function(err) {
          throw err;
        }
        errback = function(_err) {
          try {
            _errback(_err);
          } catch(err) {
            nextPromise.resolve(err, null);
          }
        };
        return nextPromise;
      },
      resolve: function(err, res) {
        if (err && errback) return errback(err);
        if (callback) callback(res);
      }
    };

    return promise;
  }

  function Resolve(promise, value) {
    if (value && 'function' == typeof value.then) {
      value.then(function(res) {
        promise.resolve(null, res);
      }, function(err) {
        promise.resolve(err, null);
      });
      return;
    }

    promise.resolve(null, value);
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      promise.resolve(err, res);
    });
    return promise;
  }

  readFile('clue1.txt').then(function(clue1) {
    throw Error('Oh no!');
    var file = clue1.trim();
    return readFile(file);
  }).then(function(clue2) {
    var file = clue2.trim();
    return readFile(file);
  }).then(function(treasure) {
    console.log(treasure);
  }, function(err) {
    console.log('error --', err.message, '-- prevented us from the treasure');
  });
}

/*
Just like the `then` callback is separated out into both an error and success case instead 
of a single case that handles both, right now our resolve function takes an error and
result, whereas normally it only handles the result. The error resolution function
is called reject. So let's implement that now.
*/
!function() {
  var fs = require('fs');

  function createPromise() {
    var callback, errback;
    var promise = {
      then: function(_callback, _errback) {
        var nextPromise = createPromise();
        callback = function(_res) {
          var res;
          try {
            res = _callback(_res);
          } catch (err) {
            nextPromise.reject(err);
            return;
          } 
          Resolve(nextPromise, res);
        };
        _errback = _errback || function(err) {
          throw err;
        }
        errback = function(_err) {
          try {
            _errback(_err);
          } catch(err) {
            nextPromise.reject(err);
          }
        };
        return nextPromise;
      },
      resolve: function(res) {
        if (callback) callback(res);
      },
      reject: function(err) {
        if (errback) errback(err);
      }
    };

    return promise;
  }

  function Resolve(promise, value) {
    if (value && 'function' == typeof value.then) {
      value.then(function(res) {
        promise.resolve(res);
      }, function(err) {
        promise.reject(err);
      });
      return;
    }

    promise.resolve(null, value);
  }

  function readFile(file) {
    var promise = createPromise();
    fs.readFile(file, 'utf8', function(err, res) {
      if (err) {
        promise.reject(err);
        return;
      }
      promise.resolve(res);
    });
    return promise;
  }

  readFile('clue1.txt').then(function(clue1) {
    var file = clue1.trim();
    return readFile(file);
  }).then(function(clue2) {
    var file = clue2.trim();
    return readFile(file);
  }).then(function(treasure) {
    console.log(treasure);
  }, function(err) {
    console.log('error --', err.message, '-- prevented us from the treasure');
  });
}
/*
Most promise libraries don't have a `createPromise` function, it's usually called defer. And 
right now what we return (`promise`) has a bunch of methods on it, not just `then`.
Normally the resolve and reject functions aren't included in the object returned by `then`. 
We would never call resolve on the return value of then. So let's rename `createPromise` to
`defer` and change what `then` returns.
*/
!function() {
  var fs = require('fs');

  function defer() {
    var callback, errback;
    var deferred = {
      promise: {
        then: function(_callback, _errback) {
          var nextDeferred = defer();
          callback = function(_res) {
            var res;
            try {
              res = _callback(_res);
            } catch (err) {
              nextDeferred.reject(err);
              return;
            } 
            Resolve(nextDeferred, res);
          };
          _errback = _errback || function(err) {
            throw err;
          }
          errback = function(_err) {
            try {
              _errback(_err);
            } catch(err) {
              nextDeferred.reject(err);
            }
          };
          return nextDeferred.promise;
        },
      },
      resolve: function(res) {
        if (callback) callback(res);
      },
      reject: function(err) {
        if (errback) errback(err);
      }
    };

    return deferred;
  }

  function Resolve(deferred, value) {
    if (value && 'function' == typeof value.then) {
      value.then(function(res) {
        deferred.resolve(res);
      }, function(err) {
        deferred.reject(err);
      });
      return;
    }

    deferred.resolve(null, value);
  }

  function readFile(file) {
    var deferred = defer();
    fs.readFile(file, 'utf8', function(err, res) {
      if (err) {
        deferred.reject(err);
        return;
      }
      deferred.resolve(res);
    });
    return deferred.promise;
  }

  readFile('clue1.txt').then(function(clue1) {
    var file = clue1.trim();
    return readFile(file);
  }).then(function(clue2) {
    var file = clue2.trim();
    return readFile(file);
  }).then(function(treasure) {
    console.log(treasure);
  }, function(err) {
    console.log('error --', err.message, '-- prevented us from the treasure');
  });
}

/*
We've almost made it to the promised land. Even though our deferred/promise API
is starting to seem familiar, our promises fail all the a-plus-promise tests.
Just a few of the things that are still missing:

1. Promises often have a way to check their progress. This is often implemented by 
passing a third argument to `then`.

2. Promises can also often be implemented to be thenable multiple times.
That looks something like:

var promise = readFile('text.txt');
promise.then(function(res) {
  // do something
});
promise.then(function(res) {
  // do something else
});

This can be implemented by changing callback/errback to arrays of pending functions.

3. Resolve and reject should return promises.

4-100 (there are many more). If you see something you want to fix, add a step by step
way for us to get there and send over a pull request.
*/
