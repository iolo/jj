module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        devel: true,
        browser: true,
        expr: true, //W030
        globals: {
          $: true,
          angular: true
        }
      },
      files: ['app/js/**/*.js']
    },
    jsdoc: {
      src: ['app/js/**/*.js'],
      options: {
        destination: 'build/docs'
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      build: {
        src: ['app/js/**/*.js'],
        dest: 'build/app/js/all.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%=pkg.name%> <%=pkg.version%> (build at ' + (new Date()) + ') */\n'
      },
      build: {
        files: {
          'build/app/js/all.min.js': ['<%=concat.build.dest%>']
        }
      }
    },
    copy: {
      build: {
        files: [
          {expand:true, cwd:'app/', src:['**'], dest:'build/app'}
        ]
      }
    },
    connect: {
      server: {
        options: {
          base: 'app',
          port: 8000,
          keepalive: true
        }
      }
    },
    clean: {
      build: ['build']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.registerTask('rsync', function() {
    var done = this.async();
    exec = require('child_process').exec('rsync -av --delete ./build/app/ root@iolo.kr:/var/www/dev.opentrophy.com', function(err, stdout, stderr) {
      if(err) {
        grunt.verbose.writeln(stderr);
        grunt.fail.fatal('rsync failed:' + err);
      } else {
        grunt.verbose.writeln(stdout);
        grunt.log.ok('rsync complete.');
      }
      done();
    });
  });

  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('build', ['jshint','concat','uglify','copy']);
  grunt.registerTask('deploy', ['build','rsync']);
  grunt.registerTask('server', ['connect']);
};
