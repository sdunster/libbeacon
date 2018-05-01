const assert = require("assert");
const Client = require("../lib/client.js");
const api_factory = require("../lib/main.js");

var setup = function() {
  if(!process.env.IDENTITY_CLIENT_ID || !process.env.IDENTITY_CLIENT_SECRET) {
    assert.fail("Must set IDENTITY_CLIENT_ID and IDENTITY_CLIENT_SECRET");
  }

  const env = "BEACON_ENV" in process.env ? process.env.BEACON_ENV : 'prod'

  return api_factory(
    process.env.IDENTITY_CLIENT_ID,
    process.env.IDENTITY_CLIENT_SECRET,
    env
  );
}

var setupAndLogin = function() {
  const api = setup();

  if(!process.env.BEACON_USERNAME || !process.env.BEACON_PASSWORD) {
    assert.fail("Must set BEACON_USERNAME and BEACON_PASSWORD");
  }

  return api.login(
    process.env.BEACON_USERNAME,
    process.env.BEACON_PASSWORD
  );
}

describe('login()', function() {
  this.timeout(5000); // login is slow :(
  it('should raise an error', function() {
    const api = setup();
    return new Promise((resolve) => {
      api.login('test', 'test')
      .then((client) => {
        assert.fail("Did not fail with incorrect credentials");
      })
      .catch((error) => {
        resolve();
      });
    });
  });

  it('should login successfully', function() {
    const api = setup();
    return api.login(
      process.env.BEACON_USERNAME,
      process.env.BEACON_PASSWORD)
    .then((client) => {
      assert(client instanceof Client);
    });
  });
});

describe('Client', function() {
  var beacon;
  before(function() {
    return setupAndLogin()
    .then((result) => {
      beacon = result;
    });
  });

  describe('get()', function() {
    it('should fetch a job', function() {
      return beacon.get('Jobs/1', {}).then((data) => {
        assert('Id' in data);
        assert('Identifier' in data);
      });
    });

    it('should fetch a job and override a header', function() {
      return beacon.get('Jobs/1', {headers: {"X-Test": 1}})
      .then((data) => {
        assert('Id' in data);
        assert('Identifier' in data);
      });
    });

  });

  describe('getPagedResults()', function() {
    this.timeout(10000);

    it('should fetch some locations', function(done) {
      var locations = [];

      beacon.getPagedResults(
        'Entities', {qs: {"Q": ""}},
        function(error, finished, data) {
          assert.ifError(error);
          locations = locations.concat(data);
          if(finished) {
            // make sure we get more than one page (50)
            assert(Array.isArray(locations));
            assert(locations.length > 60);
            done();
          }
        }
      );
    });

    it('should fail requesting non-page API', function(done) {
      beacon.getPagedResults('Jobs/1', {}, function(error, finished, data) {
        assert(error);
        assert(!finished);
        done();
      });
    });
  });
});
