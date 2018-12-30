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
    event.preventDefault();
    cancelMigration = true;
  });

  $('#button_migrate').click(function(event) {
    event.preventDefault();
    const tumblrApiKey = document.getElementById('input_tumblr_api_key').value;
    const tumblrBlogName = document.getElementById('input_tumblr_blog_name').value;
    const tumblrPostType = $('#tumblr-post-type').val();
    const arenaApiKey = document.getElementById('input_arena_api_key').value;
    const arenaAccessToken = document.getElementById('input_arena_access_token').value;
    const arenaChannelName = document.getElementById('input_arena_channel_name').value;
    const arenaVisibility = $('input[name=arena_visibility]:checked').val();

    const arenaAuthHeader = {
      headers: { 'Authorization': 'Bearer '.concat(arenaAccessToken) }
    };

    $('#loading_modal').addClass('active');
    event.preventDefault();

    const retrievePosts = function() {
      axios.get('https://api.tumblr.com/v2/blog/' + tumblrBlogName + '/posts', {
        params: {
          api_key: tumblrApiKey,
          type: (tumblrPostType !== 'all' ? tumblrPostType : undefined),
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
          status: arenaVisibility
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
        var data;
        switch(post.type) {
          case 'text':
            data = {
              title: post.title,
              description: generateDescription(post),
              content: post.body
            };
            break;
          case 'photo':
            data = {
              description: generateDescription(post),
              source: post.photos[0].original_size.url
            };
            break;
          case 'quote':
            data = {
              description: generateDescription(post),
              content: post.text
            };
            break;
          case 'link':
            data = {
              title: post.title,
              description: generateDescription(post),
              source: post.url
            };
            break;
          case 'chat':
            data = {
              title: post.title,
              description: generateDescription(post),
              content: post.body
            };
            break;
          case 'audio':
            data = {
              title: post.id3_title,
              description: generateDescription(post),
              source: post.player
            };
            break;
          case 'video':
            data = {
              title: post.source_title,
              description: generateDescription(post),
              source: post.embed_code
            };
            break;
          case 'answer':
            data = {
              description: generateDescription(post),
              content: '>' + post.question + '\n\n' + post.answer
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

  const generateDescription = function(post) {
    var description = '__Post Date__\n' + post.date + '\n\n__Link__\n' + post.post_url;
    if (post.hasOwnProperty('caption'))
      description += '\n\n__Caption__\n' + post.caption;
    if (post.hasOwnProperty('description'))
      description += '\n\n__Description__\n' + post.description;
    if (post.hasOwnProperty('source'))
      description += '\n\n__Source__\n' + post.source;
    if (post.hasOwnProperty('source_url'))
      description += '\n\n__Source URL__\n' + post.source_url;
    description += '\n\n__Tags__\n' + post.tags.join(', ');
    return description;
  };
});
