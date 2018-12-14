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

    $("#loading_modal").addClass("active");
    event.preventDefault();

    var currentOffset = 0;
    var currentPosts = [];
    const retrievePosts = function() {
      console.log("currentOffset: " + currentOffset);
      axios.get('https://api.tumblr.com/v2/blog/' + tumblrBlogName + '/posts', {
        params: {
          api_key: tumblrApiKey,
          offset: currentOffset
        },
      }).then(function(response) {
        const data = response.data.response;
        console.log(currentPosts);
        const totalPosts = data.total_posts;
        currentOffset += data.posts.length;
        currentPosts = currentPosts.concat(data.posts);
        if (currentOffset < totalPosts) {
          retrievePosts();
        } else if (totalPosts > 0) {
          startUpload();
        }
      }).catch(function (error) {
        console.log(error);
      });
    };

    const startUpload = function() {
      axios.post('https://api.are.na/v2/channels', {
        headers: { Authorization: arenaAuthString },
        params: {
          title: arenaChannelName,
          status: 'private'
        }
      }).then(function(response) {
        console.log(response);
      });
    };

    const uploadPosts = function () {

    };

    retrievePosts();
  });
});
