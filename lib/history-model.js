'use strict';

const mongoose = require('mongoose-q')();
const historyModels = {};

/**
 * Create and cache a history mongoose model
 * @param {string} collectionName Name of history collection
 * @return {mongoose.Model} History Model
 */
module.exports.HistoryModel = function HistoryModel(collectionName, options) {
  const indexes = options && options.indexes;
  const historyConnection = options && options.historyConnection;

  if (!(collectionName in historyModels)) {
    const schema = new mongoose.Schema({
      when: {
        type: Date,
        required: true,
      },
      operation: {
        type: String,
        required: true,
      },
      target: {
        type: String,
        required: true,
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      updateConditions: {
        type: mongoose.Schema.Types.Mixed
      },
    },{
      id: true,
      versionKey: false,
    });

    if (indexes) {
      indexes.forEach(function(idx) {
        schema.index(idx);
      });
    }

    if (historyConnection) {
      historyModels[collectionName] = historyConnection.model(collectionName, schema, collectionName);
    } else {
      historyModels[collectionName] = mongoose.model(collectionName, schema, collectionName);
    }
  }

  return historyModels[collectionName];
};
