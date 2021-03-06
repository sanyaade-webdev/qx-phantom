(function() {
  var CONSOLE, RUNNER, VERBOSE, loadedBefore, page, runnerUrl, testClasses, url;
  RUNNER = "";
  VERBOSE = true;
  CONSOLE = false;
  testClasses = phantom.args[0];
  runnerUrl = (RUNNER != null) && RUNNER !== "" ? phantom.args[1] || RUNNER : phantom.args[1];
  if (runnerUrl == null) {
    throw new Error("No URL configured or given");
  }
  phantom.injectJs("colors.js");
  url = testClasses ? "" + runnerUrl + "?testclass=" + testClasses : "" + runnerUrl;
  page = new WebPage();
  page.onConsoleMessage = function(msg) {
    if (CONSOLE) {
      return console.log("CONSOLE: " + msg);
    }
  };
  loadedBefore = false;
  page.open(url, function(status) {
    var processTestResults;
    if (status !== "success") {
      console.log("Unable to load page");
      phantom.exit();
    }
    if (loadedBefore) {
      return;
    }
    loadedBefore = true;
    page.evaluate(function() {
      var runner;
      if (typeof qx === "undefined") {
        console.log("qooxdoo not found");
        return;
      }
      runner = qx.core.Init.getApplication().runner;
      return runner.addListener("changeTestSuiteState", function(e) {
        var state;
        state = e.getData();
        if (state === "ready") {
          return runner.view.run();
        }
      });
    });
    processTestResults = function() {
      var error, exception, getRunnerStateAndResults, results, skip, state, success, test, testName, _i, _len, _ref, _ref2;
      getRunnerStateAndResults = function() {
        return page.evaluate(function() {
          var runner, state;
          try {
            runner = qx.core.Init.getApplication().runner;
            state = runner.getTestSuiteState();
          } catch (error) {
            console.log("Error while getting the test runners state and results");
            return [null, null];
          }
          if (state === "finished") {
            return [state, runner.view.getTestResults()];
          } else {
            return [state, null];
          }
        });
      };
      _ref = getRunnerStateAndResults(), state = _ref[0], results = _ref[1];
      if (!state) {
        return;
      }
      if (state === "error") {
        console.log("Error running tests");
        phantom.exit(1);
      }
      if (state === "finished") {
        success = [];
        skip = [];
        error = [];
        for (testName in results) {
          test = results[testName];
          if (test.state === "success") {
            success.push(testName);
            if (VERBOSE) {
              console.log("PASS".green + (" " + testName));
            }
          }
          if (test.state === "skip") {
            skip.push(testName);
            if (VERBOSE) {
              console.log("SKIP".yellow + (" " + testName));
            }
          }
          if (test.state === "error" || test.state === "failure") {
            error.push(testName);
            console.log("FAIL".red + (" " + testName));
            _ref2 = test.messages;
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
              exception = _ref2[_i];
              exception = exception.replace(/\n$/, "");
              exception = exception.replace(/\n/g, "\n  ");
              console.log(">>>> " + exception);
            }
          }
        }
        console.log("Finished running test suite.");
        console.log(("(" + success.length + " succeeded, ") + ("" + skip.length + " skipped, ") + ("" + error.length + " failed)"));
        return phantom.exit(error.length);
      }
    };
    return window.setInterval(processTestResults, 500);
  });
}).call(this);
