angular.module('searchApp', ['ngSanitize', 'algoliasearch'])
.controller('searchController', ['$scope', '$sce', 'algolia', '$window', function($scope, $sce, algolia, $window) {

  /// Members to track pagination
  var counter = 1;
  var revealSize = 10;
  var page = 0;

  /// Members to help manage URL query string
  var URLHistoryTimer = Date.now();
  var URLHistoryThreshold = 700;

  $scope.q = '';
  $scope.content = null;

  /// ***Algolia setup***

  var INDEX_NAME = 'restaurants';
  var algolia = algolia.Client('F5NLZH2K5T', '0599ee805040581d14dc26a2e2a9b43b');
  $scope.helper = algoliasearchHelper(algolia, INDEX_NAME, {
    disjunctiveFacets: ['food_type', 'stars_count_floor', 'payment_options_main'],
    hitsPerPage: 30,
    maxValuesPerFacet: 7,
    getRankingInfo: true
  });

  /// ***Geolocation configuration***

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
      $scope.helper.setQueryParameter('aroundLatLng', position.coords.latitude.toString() + ',' + position.coords.longitude.toString());
    });
  } else {
    $scope.helper.setQueryParameter('aroundLatLngViaIP', true);
  }

  /// ***Listeners***

  /// Listener and callback any new results from algolia; provides new hit data and facets
  $scope.helper.on('result', function(content, state) {    
    page = content.page;
    if (page > 0) {
      /// when utilizing page variable, we want to append results, not replace results (as is the case with any new query)
      handleShowMoreResults(content);
      return;
    }
    counter = 1;
    $scope.$apply(function() {
      $scope.hits = content.hits;
      $scope.content = content;
    });
  });

  /// Listener and callback for any change on algolia helper
  $scope.helper.on('change', function(state) {
    /// update URL params whenever we have adjusted helper algolia object
    setURLParams();
  });

  /// Listener and callback for any changes in search input box
  $scope.$watch('query', function(query) {
    $scope.helper.setQuery(query).search();
  });

  /// ***Lazy eval / More Results Logic***

  /// Helper view function to determine number of results that may be shown
  $scope.paginationLimit = function() {
    /// only show first three results on any first search
    if (counter === 1) {
      return 3;
    }
    /// otherwise
    return revealSize * counter;
  }

  /// Helper view function; boolean function called from "Show more" button
  $scope.hasMoreItemsToShow = function() {
    if ($scope.content) {
      if (counter < $scope.hits.length / revealSize) {
        return true;
      }

      if (counter == 1 && $scope.hits.length < revealSize) {
        /*  Edge case: When initial search results (hits) yield a count greater than 3, 
          * but less than pagination 'revealSize' *
            In this scenario, return true to allow user to show more items for the last two hits to render
        */
        return true;
      }
    }
    return false;
  };

  /// Helper view function; callback from "Show more" button click
  $scope.showMoreItems = function() {
    counter = counter + 1;
    if (counter * revealSize >= $scope.hits.length) {
      /// logic to handle lazy eval, incrementing pagination to get more results
      if ($scope.hits.length < $scope.content.nbHits) {
        $scope.helper.setPage(++page).search();
      }
    }
  };

  /// Helper view function to redirect to new tab
  $scope.goToUrl = function(hit) {
    $window.open(hit.reserve_url, '_blank');
  }

  /// append hits from new page hit results
  function handleShowMoreResults(content) {
    $scope.hits = $scope.hits.concat(content.hits);
  }

  /// *** Facets ***

  /// Helper view function; callback from any facet filter toggle
  $scope.toggleRefine = function($event, facet, value) {
    $event.preventDefault();
    $scope.helper.toggleRefine(facet, value).search();
  };

  /// *** URL string management ***

  /// Setter function, utilizes js helper state to populate URL of window
  function setURLParams() {
    var trackedParameters = ['attribute:*'];

    if ($scope.helper.state.query && $scope.helper.state.query.trim() !== '')  trackedParameters.push('query');
    if ($scope.helper.state.page !== 0)           trackedParameters.push('page');
    if ($scope.helper.state.index !== INDEX_NAME) trackedParameters.push('index');

    var URLParams = window.location.search.slice(1);
    var helperParams = $scope.helper.getStateAsQueryString({filters: trackedParameters});
    if (URLParams === helperParams) return;

    var now = Date.now();
    if (URLHistoryTimer > now) {
      window.history.replaceState(null, '', '?' + helperParams);
    } else {
      window.history.pushState(null, '', '?' + helperParams);
    }
    URLHistoryTimer = now+URLHistoryThreshold;
  }

  $scope.helper.search();

  $scope.toggleMobileFacetView = function() {
    $scope.showMobileFacetView = !$scope.showMobileFacetView;
  }
}])
.directive('starRating', function() {
    /// directive used to dynamically fill any star rating container
    return {
      restrict: 'E',
      template:
        ''
      ,
      scope: {
        ratingValue: '=ngModel',
      },
      link: function($scope, element, attributes) {

        var $el = $(element);
        var val = parseFloat($scope.ratingValue);
        var size = Math.max(0, (Math.min(5, val))) * 20;

        /// Create stars holder
        var $span = $('<span class="stars"/>')
        /// Set a width proportional to number of stars that should be filled 
        var $span_child = $('<span />').width(size);
        $span.append($span_child);
        $el.html($span);
      }
    };
})