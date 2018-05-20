'use strict';

var assert = require ('assert');
var Z = require ('sanctuary-type-classes');

var permissionary = require ('..');


function eq(actual, expected) {
  assert.strictEqual (arguments.length, eq.length);
  assert.strictEqual (Z.toString (actual), Z.toString (expected));
  assert.strictEqual (Z.equals (actual, expected), true);
}

var mockGrants = {
  editor: ['content.edit.*', 'image.upload'],
  viewer: ['content.view.*', 'image.view'],
  admin: ['*']
};

test ('checkPermission', function() {

  eq (typeof permissionary.checkPermission, 'function');
  eq (permissionary.checkPermission.length, 3);
  eq (typeof permissionary.checkPermission (mockGrants), 'function');
  eq (permissionary.checkPermission (mockGrants).length, 2);
  eq (typeof permissionary.checkPermission (mockGrants, ['viewer']), 'function');
  eq (permissionary.checkPermission (mockGrants, ['viewer']).length, 1);
  eq (typeof permissionary.checkPermission (mockGrants) (['viewer']), 'function');
  eq (permissionary.checkPermission (mockGrants) (['viewer']).length, 1);

  eq (typeof permissionary.checkPermission (mockGrants, ['viewer'], 'image.upload'), 'boolean');
  eq (typeof permissionary.checkPermission (mockGrants) (['viewer'], 'image.upload'), 'boolean');
  eq (typeof permissionary.checkPermission (mockGrants, ['viewer']) ('image.upload'), 'boolean');
  eq (typeof permissionary.checkPermission (mockGrants) (['viewer']) ('image.upload'), 'boolean');

  var verify = permissionary.checkPermission (mockGrants);

  eq (verify (['viewer'], 'image.upload'), false);
  eq (verify (['editor'], 'image.upload'), true);

  eq (verify (['viewer'], 'content.view.one'), true);
  eq (verify (['viewer'], 'content.view.two'), true);

  eq (verify (['admin'], 'image.upload'), true);
  eq (verify (['admin'], 'unlisted.nonsense'), true);

  eq (verify (['nonsense'], 'image.upload'), false);

  eq (verify (['viewer', 'editor'], 'image.upload'), true);
  eq (verify (['viewer', 'editor'], 'image.view'), true);
  eq (verify (['nonsense', 'editor'], 'image.upload'), true);

  eq (verify (['toString'], 'nonsense'), false);

});

test ('findRoles', function() {

  eq (typeof permissionary.findRoles, 'function');
  eq (permissionary.findRoles.length, 2);
  eq (typeof permissionary.findRoles (mockGrants), 'function');
  eq (permissionary.findRoles (mockGrants).length, 1);

  eq (typeof permissionary.findRoles (mockGrants, 'image.upload'), 'object');
  eq (typeof permissionary.findRoles (mockGrants) ('image.upload'), 'object');

  var getRoles = permissionary.findRoles (mockGrants);

  eq (getRoles ('image.upload'), ['editor', 'admin']);
  eq (getRoles ('content.view.one'), ['viewer', 'admin']);
  eq (getRoles ('content.view.two'), ['viewer', 'admin']);
  eq (getRoles ('unlisted.nonsense'), ['admin']);

});
