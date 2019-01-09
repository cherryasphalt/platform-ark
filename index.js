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

  var currentOffset;
  var currentPosts;
  var migrationProgres;
  var failureCount;
  var cancelMigration;
  var totalPosts;

  $('#input_tumblr_api_key').val(getUrlParameter('tumblr_api_key'));
  $('#input_tumblr_blog_name').val(getUrlParameter('tumblr_blog_name'));
  $('#input_arena_api_key').val(getUrlParameter('arena_api_key'));
  $('#input_arena_access_token').val(getUrlParameter('arena_access_token'));
  $('#input_arena_channel_name').val(getUrlParameter('arena_channel_name'));

  $('#cancel-migration').click(function(event) {
    event.preventDefault();
    cancelMigration = true;
    $('#loading_modal').removeClass('active');
  });

  $('#button_migrate').click(function(event) {
    event.preventDefault();
    cancelMigration = false;
    currentOffset = 0;
    currentPosts = [];
    migrationProgress = 0;
    failureCount = 0;
    $('#progress-migration').attr('max', 1);
    $('#progress-migration').removeAttr('value');
    $('#progress-label').text('');

    const tumblrApiKey = $('#input_tumblr_api_key').val();
    const tumblrBlogName = $('#input_tumblr_blog_name').val();
    const tumblrPostType = $('#tumblr-post-type').val();
    const arenaApiKey = $('#input_arena_api_key').val();
    const arenaAccessToken = $('#input_arena_access_token').val();
    const arenaChannelName = $('#input_arena_channel_name').val();
    const arenaVisibility = $('input[name=arena_visibility]:checked').val();

    const arenaAuthHeader = {
      headers: { 'Authorization': 'Bearer '.concat(arenaAccessToken) }
    };

    var generatedArenaChannelName;

    $('#loading_modal').addClass('active');

    const retrievePosts = function() {
      axios.get('https://api.tumblr.com/v2/blog/' + tumblrBlogName + '/posts', {
        params: {
          api_key: tumblrApiKey,
          type: (tumblrPostType !== 'all' ? tumblrPostType : undefined),
          limit: 50,
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
          if (currentOffset < totalPosts && !cancelMigration) {
            retrievePosts();
          } else if (currentOffset >= totalPosts) {
            currentPosts = currentPosts.reverse();
            uploadPosts();
          }
        }
      }).catch(function (error) {
        console.log(error);
      });
    };

    const startUpload = function() {
      return axios.post('https://cors-arena.herokuapp.com/https://api.are.na/v2/channels',
        {
          title: arenaChannelName,
          status: arenaVisibility
        },
        arenaAuthHeader)
        .then(function(response) {
          generatedArenaChannelName = response.data.slug;
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
          case 'photoExpanded':
            data = {
              description: generateDescription(post),
              source: post.singlePhoto.original_size.url
            };
            break;
          case 'text':
            data = {
              title: post.title,
              description: generateDescription(post),
              content: post.body
            };
            break;
          case 'photo':
            if (post.photos.length > 1) {
              for (i = 0; i < post.photos.length; i++) {
                const newPost = Object.assign({}, post);
                newPost.type = 'photoExpanded';
                newPost.singlePhoto = post.photos[i];
                newPost.currentPhotoCount = i + 1;
                currentPosts.unshift(newPost);
              }
              return uploadPosts();
            } else {
              data = {
                description: generateDescription(post),
                source: post.photos[0].original_size.url
              };
            }
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
              title: post.summary,
              description: generateDescription(post),
              source: post.audio_source_url
            };
            break;
          case 'video':
            data = {
              title: post.summary,
              description: generateDescription(post),
              source: post.post_url
            };
            if (post.hasOwnProperty('permalink_url'))
              data.source = post.permalink_url;
            if (post.hasOwnProperty('video_url'))
              data.source = post.video_url;
            break;
          case 'answer':
            data = {
              description: generateDescription(post),
              content: '>' + post.question + '\n\n' + post.answer
            };
            break;
          case 'blocks':
            data = {
              description: generateDescription(post),
              content: post.content
            }
            break;
        }
        return axios.post('https://cors-arena.herokuapp.com/https://api.are.na/v2/channels/' + generatedArenaChannelName + '/blocks',
          data, arenaAuthHeader)
          .then(function(response) {
            if (post.type !== "photoExpanded" || (post.type == "photoExpanded" && post.currentPhotoCount === post.photos.length))
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
        $('#cancel-migration').text("Finish");
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
    if (post.hasOwnProperty('currentPhotoCount') && post.photos.length > 1)
      description += '\n\n__Image ' + post.currentPhotoCount + ' of ' + post.photos.length + '__\n';
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
