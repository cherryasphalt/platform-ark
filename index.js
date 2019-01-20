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

  const migrationState = {
      currentOffset: 0,
      currentPosts: [],
      migrationProgress: 0,
      failureCount: 0,
      cancelMigration: false,
      totalPosts: 0,
  };

  const creds = {};

  $('#input_tumblr_api_key').val(getUrlParameter('tumblr_api_key'));
  $('#input_tumblr_blog_name').val(getUrlParameter('tumblr_blog_name'));
  $('#input_arena_api_key').val(getUrlParameter('arena_api_key'));
  $('#input_arena_access_token').val(getUrlParameter('arena_access_token'));
  $('#input_arena_channel_name').val(getUrlParameter('arena_channel_name'));

  const displayInputForm = function() {
      if($('#import-service-select').val() == 'Tumblr') {
          $('#import-form-tumblr').show();
          $('#import-form-pinterest').hide();
      } else if ($('#import-service-select').val() == 'Pinterest') {
          $('#import-form-tumblr').hide();
          $('#import-form-pinterest').show();
      }
  };

  $('#import-service-select').change(displayInputForm);

  $('#cancel-migration').click(function(event) {
    event.preventDefault();
    migrationState.cancelMigration = true;
    $('#loading_modal').removeClass('active');
  });

  $('#button_migrate').click(function(event) {
    event.preventDefault();
    migrationState.cancelMigration = false;
    migrationState.currentOffset = 0;
    migrationState.currentPosts = [];
    migrationState.migrationProgress = 0;
    migrationState.failureCount = 0;
    $('#progress-migration').attr('max', 1);
    $('#progress-migration').removeAttr('value');
    $('#progress-label').text('');

    creds.tumblrApiKey = $('#input_tumblr_api_key').val();
    creds.tumblrBlogName = $('#input_tumblr_blog_name').val();
    creds.tumblrPostType = $('#tumblr-post-type').val();
    creds.arenaApiKey = $('#input_arena_api_key').val();
    creds.arenaAccessToken = $('#input_arena_access_token').val();
    creds.arenaChannelName = $('#input_arena_channel_name').val();
    creds.arenaVisibility = $('input[name=arena_visibility]:checked').val();

    creds.arenaAuthHeader = {
      headers: { 'Authorization': 'Bearer '.concat(creds.arenaAccessToken) }
    };

    $('#loading_modal').addClass('active');

    displayInputForm();
    startUpload(creds).then(function(response) {
      retrievePosts(creds, migrationState);
    });
  });
});
