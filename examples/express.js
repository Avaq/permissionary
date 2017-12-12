'use strict';

const {checkPermission, findRoles} = require('..');
const app = require('express')();
const error = require('http-errors');
const serialize = require('serialize-http-error');
const json = require('body-parser').json();
const {readFile} = require('fs');
const grants = require('./grants');

// In this example, the grants are stored statically. You could create a
// dynamically configurable permission system by loading the grants from a
// database at request time.
const createVerifier = checkPermission(grants);
const getRequiredRoles = findRoles(grants);

// This is our authentication middleware.
app.use((req, res, next) => {

  // This is where we would query our database for the currently logged-in
  // user, and assign them their permissions. We could use Passport or
  // anything else to determine which user this should be. For the purpose of
  // this example, authentication is done by setting a user ID in a header.
  const userId = Number(req.headers['authenticated-user']);

  readFile('./users.json', 'utf8', (err, res) => {
    if (err) return next(err);
    const user = JSON.parse(res).filter(x => x.id === userId);

    // Get the roles out of our logged-in user. And combine them with some
    // predetermined roles, which allow us to assign permissions to everyone,
    // for example.
    const userRoles = user.map(x => ['authenticated'].concat(x.roles));
    const roles = ['everyone'].concat(userRoles[0] || ['unauthenticated']);

    // We assign the created verifier to the request object for access
    // in other middleware.
    req.auth = {
      has: createVerifier(roles),
      roles: roles,
      user: user[0] || null,
    };

    next();
  });

});

// That's it! We now have a req.auth.has() function available in every
// middleware. We could create a small abstraction that returns a middleware
// for a specific permision. How you handle errors is upto you.
const permission = required => (req, res, next) => {
  if (req.auth.has(required)) return next();
  next(error(403, `You must have one of the following roles: ${
    getRequiredRoles(required).join('; ')
  }. You have: ${
    req.auth.roles.join('; ')
  }.`));
};

// Now we define the rest of our API. I've defined these small "respond"
// middlewares for the purpose of mocking some API responses.
const respond = body => (req, res) => res.json(body);
const echo = (req, res) => res.json(req.body || {});

// What follows are some basic examples. To play around with it, do:
//
// ```sh
// node express.js &
// curl -X GET -H 'Authenticated-User: 0' localhost:3000/path
// ```
//
// You can change the 0 to one of the ID's found in ./users.json,
// and "GET" with "path" to one of the below endpoints.
app.get('/', permission('content.read.homepage'), respond({
  welcome: true,
  to: 'The blog of Alice',
}));

app.get('/comments', permission('content.read.comment'), respond([
  {author: 1, comment: 'Hello world'},
  {author: 3, comment: 'How does this work?'},
]));

app.get('/posts/1', permission('content.read.post'), respond({
  author: 1,
  body: 'Once upon a time...',
}));

app.get('/posts/1/feedback', permission('content.read.feedback'), respond([
  {author: 2, score: 90, comment: 'Good stuff!'},
]));

app.post('/comments', permission('content.write.comment'), json, echo);
app.post('/posts', permission('content.write.post'), json, echo);

app.post('/posts/1/feedback',
         permission('content.write.feedback'),
         json,
         echo);

// Those were the basic examples. We can also generate our permissions
// programmatically for more granular control. In this example, we parse the
// incomming request body as JSON, and base the required permissions on its
// contents.
app.post('/users', json, (req, res, next) => {
  const userToCreate = req.body;

  // For every role we're trying to assign to the new user, we check if the
  // author has a specific permission. The author has to have all of them to
  // proceed.
  const ok = userToCreate.roles.every(role =>
    req.auth.has(`user.create.${role}`)
  );

  if (!ok) return next(error(403, 'Insufficient permissions'));

  // We pretend to create the user.
  res.json(userToCreate);
});

// Error handling and binding.
app.use((req, res, next) => next(error(404, 'No such API')));
app.use((err, req, res, next) => res.json(serialize(err, {expose: true})));
app.listen(3000);
