//. # Permissionary - bringing permissions to the lawless
//.
//. [![NPM Version](https://badge.fury.io/js/permissionary.svg)](https://www.npmjs.com/package/permissionary)
//. [![Dependencies](https://david-dm.org/Avaq/permissionary.svg)](https://david-dm.org/Avaq/permissionary)
//. [![Build Status](https://travis-ci.org/Avaq/permissionary.svg?branch=master)](https://travis-ci.org/Avaq/permissionary)
//. [![Code Coverage](https://codecov.io/gh/Avaq/permissionary/branch/master/graph/badge.svg)](https://codecov.io/gh/Avaq/permissionary)
//. [![Greenkeeper badge](https://badges.greenkeeper.io/Avaq/permissionary.svg)](https://greenkeeper.io/)
//.
//. Tiny and framework-agnostic role-based permission management using
//. a model of *composition* over inheritance.
//.
//. ```console
//. npm install --save permissionary
//. ```
//.
//. ## Usage
//.
//. ```js
//. var {checkPermission, findRoles} = require('permissionary');
//. ```
//.
//. * [Basic](#checkPermission)
//. * [With Express][1]
//.
//. ## Philosophy
//.
//. Many permission systems use the idea of inheritance to define roles in
//. terms of other roles. This can lead to the definition of non-flexible
//. roles where the developer has to make decisions that determine what will
//. be possible in the future. [Mattias Petter Johansson][3] has
//. [a good video][4] explaining the phenomenon.
//.
//. To combat this issue, Permissionary has no inheritance. Instead, groupings
//. of grants are given names (known as roles), and multiple such roles can be
//. assigned to a user. This allows one to define very minimal roles
//. (containing the minimum number of grants necessary to carry meaning) and
//. define types of users as being compositions of multiple such roles. If at
//. any point in the future, a new type of user is required that shares the
//. responsibility of formerly unassociated roles, all you'd have to do was
//. assign both roles to that user.
//.
//. ## API

'use strict';

var micromatch = require('micromatch');

var hasProp = Object.prototype.hasOwnProperty;

//# checkPermission :: StrMap (Array String) -> Array String -> String -> Boolean
//.
//. A [curried][5] function that takes three arguments and returns a Boolean:
//.
//. 1. A mapping from role names to an array of grants represented by glob
//.    patterns to match permission names.
//. 2. An Array of role names.
//. 3. A permission name.
//.
//. The glob patterns will be filtered down to contain only those associated
//. with the given list of roles. The permission will be checked against the
//. filtered glob patters using [micromatch][6] to produce the Boolean.
//.
//. To make optimal use of this function, it is recommended to partially apply
//. the function to produce new functions, as shown in the example below:
//.
//. ```js
//. // This defines a mapping from roles to permissions.
//. // We can use wildcards to assign multiple permissions at once.
//. > var createVerifier = checkPermission({
//. .   'content-reader': ['content.read', 'images.read'],
//. .   'content-writer': ['content.write', 'images.upload'],
//. .   'superadmin':     ['*']
//. . });
//.
//. // Let's say our user Bob is a content-reader, and also a content-writer.
//. > var canBob = createVerifier(['content-reader', 'content-writer']);
//.
//. // And Alice is an administrator.
//. > var canAlice = createVerifier(['superadmin']);
//.
//. // Bob has this permission through his content-reader role.
//. > canBob('content.read');
//. true
//.
//. // Bob does not have this permission.
//. > canBob('users.create');
//. false
//.
//. // Alice, however, does. She has all permissions (even the ones
//. // we haven't thought of yet).
//. canAlice('users.create');
//. true
//. ```
function checkPermission(grants, roles, permission) {

  if (arguments.length === 1) {
    return checkPermission.bind(this, grants);
  }

  var permissions = roles.reduce(function(permissions, group) {
    return hasProp.call(grants, group) ? permissions.concat(grants[group])
                                       : permissions;
  }, []);

  function hasPermission(permission) {
    return micromatch.any(permission, permissions);
  }

  return arguments.length === 2 ? hasPermission : hasPermission(permission);

}

//# findRoles :: StrMap (Array String) -> String -> Array String
//.
//. A [curried][5] function that takes two arguments and returns an Array
//. of role names:
//.
//. 1. A mapping from role names to an array of grants represented by glob
//.    patterns to match permission names.
//. 2. A permission name.
//.
//. This function can be used to answer the question: "Which role do I need
//. to obtain a given permission?"
//.
//. ```js
//. > var getRequiredRoles = findRoles({
//. .   'content-reader': ['content.read', 'images.read'],
//. .   'content-writer': ['content.write', 'images.upload'],
//. .   'superadmin':     ['*']
//. . });
//.
//. > getRequiredRoles('content.read')
//. ['content-reader', 'superadmin']
//. ```
function findRoles(grants, permission) {
  if (arguments.length === 1) {
    return findRoles.bind(this, grants);
  }

  return Object.keys(grants).filter(function(role) {
    return micromatch.any(permission, grants[role]);
  });
}

module.exports = {
  checkPermission: checkPermission,
  findRoles: findRoles
};

//. [1]: https://github.com/Avaq/permissionary/tree/master/examples
//. [3]: https://github.com/mpj
//. [4]: https://www.youtube.com/watch?v=wfMtDGfHWpA
//. [5]: https://stackoverflow.com/questions/36314/what-is-currying
//. [6]: https://github.com/micromatch/micromatch
