import Ember from 'ember';

/**
  The Ember Infinity Base Route Mixin

  @class BaseRouteMixin
  @namespace EmberInfinity
  @module ember-infinity/mixins/base-route
  @extends Ember.Mixin
*/
export default Ember.Mixin.create({

  /**
    @private
    @property _extraParams
    @type Object
    @default {}
  */
  _extraParams: {},

  /**
    @private
    @property _infinityModelName
    @type String
    @default null
  */
  _infinityModelName: null,

  /**
    @method infinityModel
    @param {String} modelName The name of the model.
    @param {Object} queryParams Optional, query parameters.
    @param {Object} options Optional, options and constant query parameters.
    @return {Ember.RSVP.Promise}
  */
  infinityModel(modelName, queryParams, extraParams) {

    if (Ember.isEmpty(this.store) || Ember.isEmpty(this.store.find)){
      throw new Ember.Error("Ember Data store is not available to infinityModel");
    } else if (modelName === undefined) {
      throw new Ember.Error("You must pass a Model Name to infinityModel");
    }

    this.set('_infinityModelName', modelName);

    this.set('_extraParams', extraParams);

    queryParams = queryParams ? queryParams : {};
    var params = Ember.merge(queryParams, extraParams);
    return this.store.find(modelName, params);
  },

  /**
   Trigger a load of the next page of results.

   @method infinityLoad
   @param {Object} queryParams Optional, query parameters.
   @return {Boolean}
   */
  _infinityLoad(queryParams) {
    var modelName   = this.get('_infinityModelName');

    queryParams = queryParams ? queryParams : {};
    var params = Ember.merge(queryParams, this.get('_extraParams'));
    return this.store.find(modelName, params);
  },
});
