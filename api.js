const startUpload = function(creds) {
  return axios.post('https://api.are.na/v2/channels',
    {
      title: creds.arenaChannelName,
      status: creds.arenaVisibility
    },
    creds.arenaAuthHeader)
    .then(function(response) {
      creds.generatedArenaChannelName = response.data.slug;
    }).catch(function(error) {
      console.log(error);
    });
};

const retrievePosts = function(creds, migrationState) {
  axios.get('https://api.tumblr.com/v2/blog/' + creds.tumblrBlogName + '/posts', {
    params: {
      api_key: creds.tumblrApiKey,
      type: (creds.tumblrPostType !== 'all' ? creds.tumblrPostType : undefined),
      limit: 50,
      offset: migrationState.currentOffset
    },
  }).then(function(response) {
    const data = response.data.response;
    migrationState.totalPosts = data.total_posts;
    migrationState.currentOffset += data.posts.length;
    migrationState.currentPosts = migrationState.currentPosts.concat(data.posts);
    if (migrationState.totalPosts > 0) {
      $('#progress-migration').attr('max', migrationState.totalPosts);
      $('#progress-migration').attr('value', migrationState.migrationProgress);
      $('#progress-label').text(migrationState.migrationProgress + ' of ' + migrationState.totalPosts + ' migrated.');
      if (migrationState.currentOffset < migrationState.totalPosts && !migrationState.cancelMigration) {
        retrievePosts(creds, migrationState);
      } else if (migrationState.currentOffset >= migrationState.totalPosts) {
        migrationState.currentPosts = migrationState.currentPosts.reverse();
        uploadPosts(creds, migrationState);
      }
    }
  }).catch(function (error) {
    console.log(error);
  });
};

const uploadPosts = function(creds, migrationState) {
  if (migrationState.currentPosts.length > 0 && !migrationState.cancelMigration) {
    const post = migrationState.currentPosts.shift();
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
            migrationState.currentPosts.unshift(newPost);
          }
          return uploadPosts(creds, migrationState);
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
    return axios.post('https://api.are.na/v2/channels/' + creds.generatedArenaChannelName + '/blocks',
      data, creds.arenaAuthHeader)
      .then(function(response) {
        if (post.type !== "photoExpanded" || (post.type == "photoExpanded" && post.currentPhotoCount === post.photos.length))
          migrationState.migrationProgress++;
        $('#progress-migration').attr('value', migrationState.migrationProgress);
        $('#progress-label').text(migrationState.migrationProgress + ' of ' + migrationState.totalPosts + ' migrated.');
        uploadPosts(creds, migrationState);
      }).catch(function(error) {
        console.log(error);
        migrationState.failureCount++;
        $('#failure-label').text(migrationState.failureCount + ' failed.');
        uploadPosts(creds, migrationState);
      });
  } else {
    $('#cancel-migration').text("Finish");
    return new Promise(function(resolve, reject) {
        resolve({});
    });
  }
};
