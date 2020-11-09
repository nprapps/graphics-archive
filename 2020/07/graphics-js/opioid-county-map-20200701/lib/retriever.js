/*

Typical usage:

// create a Retriever that will call our function when data exists
var pup = new Retriever(this.load);
// set the URL and start the tick
pup.watch(this.getAttribute("src"), 15);

*/

class Retriever {
  constructor(callback) {
    this.ondata = callback || function() {};
    this.timeout = null;
    this.interval = 15;
    this.etag = null;
    this.url = null;
    this.tick = this.tick.bind(this);
  }

  watch(url, interval) {
    this.stop();
    if (interval) {
      this.start(interval);
    }
    this.url = url;
    this.fetch();
  }

  once(url) {
    this.url = url;
    this.fetch();
  }

  async fetch() {
    if (!this.url) return;
    // cancel current requests
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    // create a new controller for fetch
    var signal;
    if ("AbortController" in window) {
      this.controller = new AbortController();
      signal = this.controller.signal;
    }
    try {
      var response = await fetch(this.url, {
        headers: {
          "If-None-Match": this.etag
        },
        signal
      });
    } catch (err) {
      return console.log(`Request for ${this.url} was cancelled`);
    }
    if (response.status >= 400) {
      return console.log(`Request for ${this.url} failed with ${response.statusText}`);
    }
    if (response.status == 304) {
      return;
    }
    this.etag = response.headers.get("etag");
    var data = await response.json();
    this.ondata(data, response);
  }

  async tick() {
    this.start();
    await this.fetch();
  }

  start(interval = this.interval) {
    this.stop(true);
    this.interval = interval;
    this.timeout = setTimeout(this.tick, interval * 1000);
  }

  stop(timerOnly = false) {
    if (!timerOnly && this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
  }

}

module.exports = Retriever;