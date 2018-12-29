$( document ).ready(function() {
  const getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
  };

  var currentOffset = 0;
  var currentPosts = [];
  var migrationProgress = 0;
  var failureCount = 0;
  var cancelMigration = false;
  var totalPosts;

  $('#input_tumblr_api_key').val(getUrlParameter('tumblr_api_key'));
  $('#input_tumblr_blog_name').val(getUrlParameter('tumblr_blog_name'));
  $('#input_arena_api_key').val(getUrlParameter('arena_api_key'));
  $('#input_arena_access_token').val(getUrlParameter('arena_access_token'));
  $('#input_arena_channel_name').val(getUrlParameter('arena_channel_name'));

  $('#cancel-migration').click(function(event) {
    cancelMigration = true;
  })

  $('#migration_form').submit(function(event) {
    const tumblrApiKey = document.getElementById('input_tumblr_api_key').value;
    const tumblrBlogName = document.getElementById('input_tumblr_blog_name').value;
    const arenaApiKey = document.getElementById('input_arena_api_key').value;
    const arenaAccessToken = document.getElementById('input_arena_access_token').value;
    const arenaChannelName = document.getElementById('input_arena_channel_name').value;

    const arenaAuthHeader = {
      headers: { 'Authorization': 'Bearer '.concat(arenaAccessToken) }
    };

    $('#loading_modal').addClass('active');
    event.preventDefault();

    const retrievePosts = function() {
      axios.get('https://api.tumblr.com/v2/blog/' + tumblrBlogName + '/posts', {
        params: {
          api_key: tumblrApiKey,
          offset: currentOffset
        },
      }).then(function(response) {
        const data = response.data.response;
        totalPosts = data.total_posts;
        currentOffset += data.posts.length;
        currentPosts = currentPosts.concat(data.posts);
        if (totalPosts > 0) {
          $('#progress-migration').attr('max', totalPosts);
          $('#progress-migration').attr('value', migrationProgress);
          $('#progress-label').text(migrationProgress + ' of ' + totalPosts + ' migrated.');
          uploadPosts().then(function(response) {
            if (currentOffset < totalPosts && !cancelMigration) {
              retrievePosts();
            }
          });
        }
      }).catch(function (error) {
        console.log(error);
      });
    };

    const startUpload = function() {
      return axios.post('https://cors-anywhere.herokuapp.com/https://api.are.na/v2/channels',
        {
          title: arenaChannelName,
          status: 'public'
        },
        arenaAuthHeader)
        .then(function(response) {
          console.log(response);
        }).catch(function(error) {
          console.log(error);
        });
    };

    const uploadPosts = function () {
      if (currentPosts.length > 0 && !cancelMigration) {
        const post = currentPosts.shift();
        console.log('uploading post', post);
        console.log('cancelMigration', cancelMigration);
        var data;
        switch(post.type) {
          case 'text':
            data = {
              title: post.title,
              description: post.source_url,
              content: post.body
            };
            break;
          case 'photo':
            data = {
              description: post.caption,
              source: post.photos[0].original_size.url
            };
            break;
          case 'quote':
            data = {
              description: post.source,
              content: post.text
            };
            break;
          case 'link':
            data = {
              title: post.title,
              description: post.description,
              source: post.url
            };
            break;
          case 'chat':
            data = {
              title: post.title,
              description: post.source_url,
              content: post.body
            };
            break;
          case 'audio':
            data = {
              title: post.id3_title,
              description: post.caption,
              content: post.player
            };
            break;
          case 'video':
            data = {
              title: post.source_title,
              description: post.caption,
              content: post.embed_code
            };
            break;
          case 'answer':
            data = {
              content: post.question + '\n' + post.answer
            };
            break;
        }
        return axios.post('https://cors-anywhere.herokuapp.com/https://api.are.na/v2/channels/' + arenaChannelName + '/blocks',
          data, arenaAuthHeader)
          .then(function(response) {
            migrationProgress++;
            $('#progress-migration').attr('value', migrationProgress);
            $('#progress-label').text(migrationProgress + ' of ' + totalPosts + ' migrated.');
            uploadPosts();
          }).catch(function(error) {
            console.log(error);
            failureCount++;
            $('#failure-label').text(failureCount + ' failed.');
            uploadPosts();
          });
      } else {
        return new Promise(function(resolve, reject) {
            resolve({});
        });
      }
    };

    startUpload().then(function(response) {
      retrievePosts();
    });
  });

  const generateDescription = function() {
    
  };
});
