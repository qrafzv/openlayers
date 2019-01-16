/**
* @module ol/source/n2Cluster
*/
import {getUid} from '../util.js';
import Cluster from './Cluster.js';
import {transformExtent} from '../proj.js';
import {getCenter} from '../extent.js';

import {buffer, createEmpty, createOrUpdateFromCoordinate} from '../extent.js';
import Point from '../geom/Point.js';
import Feature from '../Feature.js';

import {scale as scaleCoordinate, add as addCoordinate} from '../coordinate.js';
/**
* @classdesc
* Layer source to cluster vector data. Working module for nunaliit webgis
* system
*/
class n2Cluster extends Cluster {

  constructor(options) {
    super({
      attributions: options.attributions,
      wrapX: options.wrapX
    });

    /**
    * APIProperty: distance
    * {Integer} Pixel distance between features that should be considered a
    *     single cluster.  Default is 20 pixels.
    */
    this.distance = options.distance !== undefined ? options.distance : 20;

    /**
    * APIProperty: minimumPolygonPixelSize
    * {Integer} Minimum pixel size that a polygon has to be so that it is
    * not converted to a point.  Default is 20 pixels.
    */
    this.minimumPolygonPixelSize = options.minimumPolygonPixelSize !== undefined ?
    options.minimumPolygonPixelSize : this.distance;

    /**
    * APIProperty: minimumLinePixelSize
    * {Integer} Minimum pixel size that a line has to be so that it is
    * not converted to a point.  Default is 20 pixels.
    */
    this.minimumLinePixelSize = options.minimumLinePixelSize !== undefined ?
    options.minimumLinePixelSize : this.distance;

    /**
    * APIProperty: disableDynamicClustering
    * {Boolean} If true, disable default behaviour which is to turn small
    * polygons and lines into cluster, but leaving larger ones from clustering.
    */
    this.disableDynamicClustering =  options.disableDynamicClustering !== undefined ? options.disableDynamicClustering : false;

    /**
    * APIProperty: clusterPointsOnly
    * {Boolean} If true, skip lines and polygons during clustering. The option
    * "disableDynamicClustering" must be set for this option to take effect.
    */
    this.clusterPointsOnly = options.clusterPointsOnly !== undefined ? options.clusterPointsOnly : false;

    /**
    * APIProperty: threshold
    * {Integer} Optional threshold below which original features will be
    *     added to the layer instead of clusters.  For example, a threshold
    *     of 3 would mean that any time there are 2 or fewer features in
    *     a cluster, those features will be added directly to the layer instead
    *     of a cluster representing those features.  Default is null (which is
    *     equivalent to 1 - meaning that clusters may contain just one feature).
    */
    this.threshold = options.threshold !== undefined ? options.threshold : null;

    /**
    * Property: resolution
    * {Float} The resolution (map units per pixel) of the current cluster set.
    */
    this.resolution = 1;

    /**
    * Property: projection
    * {<OpenLayers.Projection>} The projection currently used by the map
    */
    this.projection = null;

    /**
    * Property: clusterPrefix
    * {Integer} The string portion of the identifiers to be given to clusters.
    */
    this.clusterPrefix = options.clusterPrefix;

    /**
    * Property: clusterId
    * {Integer} The integer portion of the next identifier to be given to clusters.
    */
    this.clusterId = 1;

  }

  setResolution(resolution){
    this.resolution = resolution;
  }

  setProjection(projection){
    this.projection = projection;
  }

  /**
  * @protected
  */
  cluster() {
    if (this.resolution === undefined) {
      return;
    }
    this.features.length = 0;
    const extent = createEmpty();
    const mapDistance = this.distance * this.resolution;
    const features = this.source.getFeatures();
    /**
    * @type {!Object<string, boolean>}
    */
    const clustered = {};
    const inEligibleList ={};
    for (let i = 0, ii = features.length; i < ii; i++) {
      const feature = features[i];
      const uid = getUid(feature);
      if ( !this._isEligibleFeature(feature) ) {
        inEligibleList[uid] = true;
        continue;
      }
      if(!(getUid(feature) in clustered)) {

        const coordinates = getCenter(feature.getGeometry().computeExtent());
        createOrUpdateFromCoordinate(coordinates, extent);
        buffer(extent, mapDistance, extent);

        let neighbors = this.source.getFeaturesInExtent(extent);
        neighbors = neighbors.filter(function(neighbor) {
          const uid = getUid(neighbor);
          if (!(uid in clustered) &&
          !((uid in inEligibleList) || (!this._isEligibleFeature(feature)))) {
            clustered[uid] = true;
            return true;
          } else {
            return false;
          }
        });
        this.features.push(this.createCluster(neightbors));
      }
    }
  }

  /**
  * Legacy clustering
  */
  // performClustering(features){
  //  var resolution = this.resolution;
  //  var clusters = [];
  //  var featuresToAdd = [];
  //  var feature, clustered, cluster;
  //  for(var i=0; i<features.length; ++i) {
  //      feature = features[i];
  //      if( !this._isEligibleFeature(feature) ){
  // 	       featuresToAdd.push(feature);
  //
  //      } else if(feature.geometry) {
  // 	     clustered = false;
  //   		 for(var j=clusters.length-1; j>=0; --j) {
  //   		     cluster = clusters[j];
  //   		     if(this._shouldCluster(cluster, feature)) {
  //   			        this._addToCluster(cluster, feature);
  //   			           clustered = true;
  //   			           break;
  //   		     };
  //   		 };
  //   		 if(!clustered) {
  //   			 var c = this._createCluster(feature);
  //   		     clusters.push(c);
  //   		     featuresToAdd.push(c);
  //   		 };
  //      };
  //  };
  //
  //  var finalFeatures = [];
  //  //post-process the finalFeatures
  //  if( this.threshold > 1 ) {
  //      for(var i=0, len=featuresToAdd.length; i<len; ++i) {
  // 	 var candidate = featuresToAdd[i];
  // 	 if( candidate.cluster
  // 	  && candidate.cluster.length < this.threshold ) {
  // 		 candidate.cluster.forEach(function(f){
  // 		 finalFeatures[finalFeatures.length] = f;
  // 		 });
  // 	 } else {
  // 		 finalFeatures[finalFeatures.length] = candidate;
  // 	 };
  //      };
  //
  //  } else {
  // 		 finalFeatures = featuresToAdd;
  //  };
  //
  // 	 return finalFeatures;
  //  },
  //
  // /**
  //    * Method: belongToCluster
  //    * Determine whether to include a feature in a given cluster.
  //    *
  //    * Parameters:
  //    * cluster - {<OpenLayers.Feature.Vector>} A cluster.
  //    * feature - {<OpenLayers.Feature.Vector>} A feature.
  //    *
  //    * Returns:
  //    * {Boolean} The feature should be included in the cluster.
  //    */
  //   _belongToCluster(cluster, feature) {
  //       var cc = getCenter(cluster.getGeometry().computeExtent());
  //       var fc = getCenter(feature.getGeometry().computeExtent());
  //       var distance = (
  //           Math.sqrt(
  //               Math.pow((cc.lon - fc.lon), 2) + Math.pow((cc.lat - fc.lat), 2)
  //           ) / this.resolution
  //       );
  //       return (distance <= this.distance);
  //   },
  //
  //   /**
  //    * Method: addToCluster
  //    * Add a feature to a cluster.
  //    *
  //    * Parameters:
  //    * cluster - {<OpenLayers.Feature.Vector>} A cluster.
  //    * feature - {<OpenLayers.Feature.Vector>} A feature.
  //    */
  //   _addToCluster(cluster, feature) {
  //       cluster.cluster.push(feature);
  //       cluster.attributes.count += 1;
  //   },

  /**
  * Method: createCluster
  * Given a feature, create a cluster.
  *
  * Parameters:
  * feature - {<OpenLayers.Feature.Vector>}
  *
  * Returns:
  * {<OpenLayers.Feature.Vector>} A cluster.
  */
  createCluster(features) {

    const centroid = [0, 0];
    for (let i = features.length-1; i>= 0; --i) {
      var centerDelta = getCenter(feature[i].getGeometry().computeExtent());
      if(centerDelta) {
        addCoordinate(centroid, centerDelta);
      }
    }
    scaleCoordinate(centroid, 1/ features.length);

    const cluster = new Feature(new Point(centroid));
    cluster.set('features', features);
    cluster.set('fid', this.clusterPrefix + this.clusterId );
    ++this.clusterId;
    return cluster;

  }

  /**
  * Method: _isEligibleFeature
  * Returns true if a feature should be clustered
  *
  * Returns:
  * {Boolean} True if the feature should be considered for clusters
  */
  _isEligibleFeature(feature) {
    if( feature.n2DisableClustering ){
      return false;
    };

    // By default, cluster everything
    var eligible = true;

    if( !this.disableDynamicClustering ) {
      // Dynamic Clustering
      // Small polygons and lines are turned into a cluster
      eligible = false;

      var extent = this._computeFullBoundingBox(feature);
      if( extent ){
        // If the original bounds are larger than what is expected
        // by the resolution, do not cluster. At one point, the correct
        // geometry will arrive to show this feature.
        let xLen =(extent[2]-extent[0])/ this.resolution;
        let yLen = (extent[3]-extent[1]) / this.resolution;
        if( (xLen) < this.minimumLinePixelSize
        && (yLen) < this.minimumLinePixelSize ) {
          eligible = true;
        };
      } else {
        // We are unable to compute the bounds for this feature.
        // Use the geometry for the purpose of clustering
        if( feature.getGeometry().getType() == 'Point'){
          eligible = true;
        } else {
          var bounds = cluster.getGeometry().computeExtent();

          let xLen = bounds.getWidth() / this.resolution;
          let yLen = bounds.getHeight() / this.resolution;
          if( (xLen) < this.minimumLinePixelSize
          && (yLen) < this.minimumLinePixelSize ) {
            eligible = true;
          };
        };
      };

    } else if( this.clusterPointsOnly ){
      // Cluster Point Only
      // Do not cluster polygons and lines
      eligible = false;
      if( feature.getGeometry.getType() == 'Point'){
        eligible = true;
      };
    };

    return eligible;
  }

  /**
  * Method: _computeFullBoundingBox
  * Compute the bounding box of the original geometry. This may differ from
  * the bounding box of the geometry on the feature since this can be a
  * simplification.
  *
  * Returns:
  * {<OpenLayers.Bounds>} The bounding box of the original geometry translated for
  * the current map projection.
  */
  _computeFullBoundingBox(f) {
    return _ComputeFeatureOriginalBboxForMapProjection(f, this.projection);
  }
  _ComputeFeatureOriginalBboxForMapProjection(f, mapProj){
    // Each feature has a projection stored at f.n2GeomProj
    // that represents the original projection for a feature
    //
    // Each feature has a property named 'n2ConvertedBbox' that contains
    // the full geometry bbox converted for the map projection, if
    // already computed.

    if( f && f.n2ConvertedBbox ){
      return f.n2ConvertedBbox;
    };

    var geomBounds = undefined;
    if( f.data
      && f.data.nunaliit_geom
      && f.data.nunaliit_geom.bbox
      && f.n2GeomProj
      && mapProj ){

        var bbox = f.data.nunaliit_geom.bbox;
        if( Array.isArray(bbox)
        && bbox.length >= 4 ){
          geomBounds = bbox;

          if( mapProj.getCode() !== f.n2GeomProj.getCode ){
            geomBounds = transformExtent(bbox,f.n2GeomProj, mapProj);
          };

          f.n2ConvertedBbox = geomBounds;
        };
      };

      return geomBounds;
    };
}

export default n2Cluster;
