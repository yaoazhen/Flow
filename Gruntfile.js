'use strict';

module.exports = function (grunt) {
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    jshint: {

    },
    clean: {
      dist: {

      }
    },
    watch: {

    },
    concat:{

    }
  });


  grunt.registerTask('server', function () {

  });

  grunt.registerTask('build', function () {

  });

  grunt.registerTask('test', function () {

  });
};