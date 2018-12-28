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

  $("#input_tumblr_api_key").val(getUrlParameter('tumblr_api_key'));
  $("#input_tumblr_blog_name").val(getUrlParameter('tumblr_blog_name'));
  $("#input_arena_api_key").val(getUrlParameter('arena_api_key'));
  $("#input_arena_access_token").val(getUrlParameter('arena_access_token'));
  $("#input_arena_channel_name").val(getUrlParameter('arena_channel_name'));

  $( "#migration_form" ).submit(function( event ) {
    const tumblrApiKey = document.getElementById("input_tumblr_api_key").value;
    const tumblrBlogName = document.getElementById("input_tumblr_blog_name").value;
    const arenaApiKey = document.getElementById("input_arena_api_key").value;
    const arenaAccessToken = document.getElementById("input_arena_access_token").value;
    const arenaChannelName = document.getElementById("input_arena_channel_name").value;

    const arenaAuthString = 'Bearer '.concat(arenaAccessToken);
    const arenaAuthHeader = {
      headers: { 'Authorization': arenaAuthString }
    };

    $("#loading_modal").addClass("active");
    event.preventDefault();
    console.log(arenaAuthString);

    var currentOffset = 0;
    var currentPosts = [];
    const retrievePosts = function() {
      axios.get('https://api.tumblr.com/v2/blog/' + tumblrBlogName + '/posts', {
        params: {
          api_key: tumblrApiKey,
          offset: currentOffset
        },
      }).then(function(response) {
        const data = response.data.response;
        const totalPosts = data.total_posts;
        currentOffset += data.posts.length;
        currentPosts = currentPosts.concat(data.posts);
        if (totalPosts > 0) {
          uploadPosts().then(function(response) {
            if (currentOffset < totalPosts) {
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
      if (currentPosts.length > 0) {
        const post = currentPosts.shift();
        console.log("uploading post", post);
        var data;
        switch(post.type) {
          case "text":
            data = {
              title: post.title,
              description: post.source_url,
              content: post.body
            };
            break;
          case "photo":
            data = {
              title: post.caption,
              description: post.source_url,
              //source: post.photos[0].original_size.url
              source: post.post_url
            };
            break;
        }
        return axios.post('https://cors-anywhere.herokuapp.com/https://api.are.na/v2/channels/' + arenaChannelName + '/blocks',
          data, arenaAuthHeader)
          .then(function(response) {
            console.log("block response", response);
            uploadPosts();
          }).catch(function(error) {
            console.log(error);
            uploadPosts();
          });
      }
    };

    startUpload().then(function(response) {
      retrievePosts();
    });
  });
});
