"use strict";
const mongoose = require('mongoose');
const hm = require('./history-model');

module.exports = function historyPlugin(schema, options) {
  const customCollectionName  = options && options.customCollectionName;
  const customDiffAlgo = options && options.customDiffAlgo;
  const diffOnly  = options && options.diffOnly;

  // Clear all history collection from Schema
  schema.statics.historyModel = function() {
    return hm.HistoryModel(hm.historyCollectionName(this.collection.name, customCollectionName), options);
  };

  // Clear all history documents from history collection
  schema.statics.clearHistory = function(callback) {
    const History = hm.HistoryModel(hm.historyCollectionName(this.collection.name, customCollectionName), options);
    History.remove({}, function(err) {
      callback(err);
    });
  };

  // Save original data
  schema.post( 'init', function() {
    if (diffOnly){
      this._original = this.toObject();
    }
  });

  // Create an copy when insert or update, or a diff log
  schema.pre('save', function(next) {
    const historyDoc = {};

    if(diffOnly && !this.isNew) {
      var original = this._original;
      delete this._original;
      var d = this.toObject();
      var diff = {};
      diff['_id'] = d['_id'];
      for(var k in d){
        if(customDiffAlgo) {
          var customDiff = customDiffAlgo(k, d[k], original[k]);
          if(customDiff) {
            diff[k] = customDiff.diff;
          }
        } else {
          if(String(d[k]) != String(original[k])){
            diff[k] = d[k];
          }
        }
      }
      delete diff.__v;
      historyDoc['when'] = new Date();
      historyDoc['operation'] = 'update';
      historyDoc['target'] = 'instance';
      historyDoc['data'] = diff;
    } else {
      var d = this.toObject();
      delete d.__v;
      historyDoc['when'] = new Date();
      historyDoc['target'] = 'instance';
      historyDoc['operation'] = this.isNew ? 'create' : 'update';
      historyDoc['data'] = d;
    }

    let history = new hm.HistoryModel(hm.historyCollectionName(this.collection.name, customCollectionName), options)(historyDoc);
    history.save(next);
  });

  // Listen on update
  schema.pre('update', getUpdateHook({ operation: 'update', target: 'model' }));

  // Create an copy when insert or update
  schema.pre('remove', function(next) {
    let d = this.toObject();
    delete d.__v;

    let historyDoc = {};
    historyDoc['when'] = new Date();
    historyDoc['operation'] = 'delete';
    historyDoc['target'] = 'instance';
    historyDoc['data'] = d;

    let history = new hm.HistoryModel(hm.historyCollectionName(this.collection.name, customCollectionName), options)(historyDoc);
    history.save(next);
  });

  schema.pre('findOneAndUpdate', getUpdateHook({ operation: 'findOneAndUpdate', target: 'model' }));

  schema.pre('findOneAndRemove', getUpdateHook({ operation: 'findOneAndRemove', target: 'model' }));

  function getUpdateHook(options) {
    return function(next) {
      let d = this._update.$set;
      delete d.__v;

      let historyDoc = {};
      historyDoc['when'] = new Date();
      historyDoc['operation'] = options.operation;
      historyDoc['target'] = options.target;
      historyDoc['data'] = d;

      let history = new hm.HistoryModel(hm.historyCollectionName(this.mongooseCollection.collectionName, customCollectionName), options)(historyDoc);
      history.save(next);
    }
  }
};
