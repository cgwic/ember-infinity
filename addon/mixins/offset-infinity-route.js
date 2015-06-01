import Ember from 'ember';
import InfinityRouteBase from 'ember-infinity/mixins/infinity-route-base';

/**
  The Ember Offset Infinity Route Mixin enables an application route to load paginated
  records for the route `model` as triggered by the controller (or Infinity Loader
  component).

  @class RouteMixin
  @namespace EmberInfinity
  @module ember-infinity/mixins/offset-infinity-route
  @extends Ember.Mixin
*/
export default Ember.Mixin.create(InfinityRouteBase, {

  /**
    @private
    @property _limit
    @type Integer
    @default 25
  */
  _limit: 25,

  /**
    @private
    @property _currentOffset
    @type Integer
    @default 0
  */
  _currentOffset: 0,

  /**
    @private
    @property _loadingMore
    @type Boolean
    @default false
  */
  _loadingMore: false,

  /**
    @private
    @property _totalCount
    @type Integer
    @default 0
  */
  _totalCount: 0,

  /**
    @private
    @property _modelPath
    @type String
    @default 'controller.model'
  */
  _modelPath: 'controller.model',

  /**
    @private
    @property offsetStep
    @type Integer
    @default limit value
  */
  offsetStep: 1,

  /**
   * Name of the "limit" param in the
   * resource request payload
   * @type {String}
   * @default  "limit"
   */
  limitParam: 'limit',

  /**
   * Name of the "offset" param in the
   * resource request payload
   * @type {String}
   * @default "offset"
   */
  offsetParam: 'offset',

  /**
   * Path of the "total count" param in
   * the HTTP response
   * @type {String}
   * @default  "meta.total"
   */
  totalCountParam: 'meta.totalCount',

  /**
    @private
    @property _canLoadMore
    @type Boolean
    @default false
  */
  _canLoadMore: Ember.computed('_totalCount', '_currentOffset', 'offsetStep', function() {
    var totalCount  = this.get('_totalCount');
    var currentOffset = this.get('_currentOffset');
    var offsetStep = this.get('offsetStep');
    console.log('totalCount:', totalCount);
    console.log('currentOffset:', currentOffset);
    console.log('offsetStep:', offsetStep);
    return (totalCount && offsetStep) ? (currentOffset < totalCount) : false;
  }),

  /**
    Use the infinityModel method in the place of `this.store.find('model')` to
    initialize the Infinity Model for your route.

    @method infinityModel
    @param {String} modelName The name of the model.
    @param {Object} options Optional, the limit and offset to load from.
    @return {Ember.RSVP.Promise}
  */
  infinityModel(modelName, options) {

    var extraParams   = options ? Ember.merge({}, options) : {};
    var initialOffset = extraParams.initialOffset || this.get('_currentOffset');
    var limit         = extraParams.limit || this.get('_limit');
    var offsetStep    = extraParams.offsetStep || this.get('_limit');
    var modelPath     = extraParams.modelPath || this.get('_modelPath');

    delete extraParams.initialOffset;
    delete extraParams.limit;
    delete extraParams.offsetStep;
    delete extraParams.modelPath;

    this.set('_limit', limit);
    this.set('_currentOffset', initialOffset);
    this.set('offsetStep', offsetStep);
    this.set('_modelPath', modelPath);

    var requestPayloadBase = {};
    requestPayloadBase[this.get('limitParam')] = limit;
    requestPayloadBase[this.get('offsetParam')] = initialOffset;

    var promise = this._super(modelName, requestPayloadBase, extraParams);

    promise.then(
      infinityModel => {
        var totalCount = infinityModel.get(this.get('totalCountParam'));
        this.set('_totalCount', totalCount);
        infinityModel.set('reachedInfinity', !this.get('_canLoadMore'));
        Ember.run.scheduleOnce('afterRender', this, 'infinityModelUpdated', {
          currentOffset: initialOffset,
          totalCount: totalCount,
          newObjects: infinityModel
        });
      },
      () => {
        throw new Ember.Error("Could not fetch Infinity Model. Please check your serverside configuration.");
      }
    );

    return promise;
  },

  /**
   Trigger a load of the next page of results.

   @method infinityLoad
   @return {Boolean}
   */
  _infinityLoad() {
    var nextOffset    = this.get('_currentOffset') + this.get('offsetStep');
    var limit     = this.get('_limit');
    var totalCount  = this.get('_totalCount');
    var model       = this.get(this.get('_modelPath'));

    if (!this.get('_loadingMore') && this.get('_canLoadMore')) {
      this.set('_loadingMore', true);

      var promise = this._super({ offset: nextOffset, limit: limit });

      promise.then(
        infinityModel => {
          model.pushObjects(infinityModel.get('content'));
          this.set('_loadingMore', false);
          this.set('_currentOffset', nextOffset);
          Ember.run.scheduleOnce('afterRender', this, 'infinityModelUpdated', {
            currentOffset: nextOffset,
            totalCount: totalCount,
            newObjects: infinityModel
          });
          if (!this.get('_canLoadMore')) {
            this.set(this.get('_modelPath') + '.reachedInfinity', true);
            Ember.run.scheduleOnce('afterRender', this, 'infinityModelLoaded', {
              totalCount: totalCount
            });
          }
        },
        () => {
          this.set('_loadingMore', false);
          throw new Ember.Error("Could not fetch Infinity Model. Please check your serverside configuration.");
        }
      );
    } else {
      if (!this.get('_canLoadMore')) {
        this.set(this.get('_modelPath') + '.reachedInfinity', true);
        Ember.run.scheduleOnce('afterRender', this, 'infinityModelLoaded', { totalCount: totalCount });
      }
    }
    return false;
  },

  actions: {
    infinityLoad() {
      this._infinityLoad();
    }
  }
});
