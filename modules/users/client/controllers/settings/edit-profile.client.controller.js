(function () {
  'use strict';

  angular
    .module('users')
    .controller('EditProfileController', EditProfileController);

  EditProfileController.$inject = ['$scope', '$http', '$location', 'UsersService', 'Authentication'];

  function EditProfileController($scope, $http, $location, UsersService, Authentication) {
    var vm = this;

    vm.user = Authentication.user;
    // console.log(tmpUserService);
    vm.updateUserProfile = updateUserProfile;

    // Update a user profile
    function updateUserProfile(isValid) {
      vm.success = vm.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'vm.userForm');
        return false;
      }

      var user = new UsersService(vm.user);
      // console.log(user);

      user.$update(function (response) {
        $scope.$broadcast('show-errors-reset', 'vm.userForm');

        vm.success = true;
        Authentication.user = response;
      }, function (response) {
        vm.error = response.data.message;
      });
    }
    var tmpUserService = new UsersService(vm.user);
    tmpUserService.$update(function (response) {
      // $scope.$broadcast('show-errors-reset', 'vm.userForm');
      // vm.success = true;
      Authentication.user = response;
      // console.log(response);
      vm.user._id = response._id;
    }, function (response) {
      vm.error = response.data.message;
    });
    // vm.user._id = tmpUserService._id;
  }
}());
