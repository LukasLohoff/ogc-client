import {
  CollectionParameter,
  CollectionParameterType,
  CollectionParameterTypes,
  ConformanceClass,
  OgcApiCollectionInfo,
  OgcApiDocument,
  OgcApiEndpointInfo,
  TileMatrixSet,
} from './model.js';
import { assertHasLinks } from './link-utils.js';
import { EndpointError } from '../shared/errors.js';

export function parseEndpointInfo(rootDoc: OgcApiDocument): OgcApiEndpointInfo {
  try {
    assertHasLinks(rootDoc, [
      'data',
      'http://www.opengis.net/def/rel/ogc/1.0/data',
    ]);
    assertHasLinks(rootDoc, [
      'conformance',
      'http://www.opengis.net/def/rel/ogc/1.0/conformance',
    ]);
  } catch (e) {
    throw new EndpointError(`The endpoint appears non-conforming, the following error was encountered:
${e.message}`);
  }
  return {
    title: rootDoc.title as string,
    description: rootDoc.description as string,
    attribution: rootDoc.attribution as string,
  };
}

export function parseConformance(doc: OgcApiDocument): ConformanceClass[] {
  return doc.conformsTo as string[];
}

export function parseCollections(
  itemType: 'record' | 'feature' | null = null,
  dataType: 'vector' | null = null
): (doc: OgcApiDocument) => string[] {
  return (doc: OgcApiDocument) =>
    (doc.collections as OgcApiCollectionInfo[])
      .filter(
        (collection) =>
          (itemType === null || collection.itemType === itemType) &&
          (dataType === null || collection.dataType === dataType)
      )
      .map((collection) => collection.id as string);
}

export function checkTileConformance(conformance: ConformanceClass[]) {
  return (
    conformance.indexOf(
      'http://www.opengis.net/spec/ogcapi-tiles-1/1.0/conf/core'
    ) > -1
  );
}

export function checkStyleConformance(conformance: ConformanceClass[]) {
  return (
    conformance.indexOf(
      'http://www.opengis.net/spec/ogcapi-styles-1/0.0/conf/core'
    ) > -1
  );
}

export function checkHasRecords([collections, conformance]: [
  OgcApiCollectionInfo[],
  ConformanceClass[]
]) {
  const classes = [
    'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/record-core',
    'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/record-collection',
    'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/record-api',
  ];
  return (
    (classes.every((confClass) => conformance.indexOf(confClass) > -1) ||
      conformance.indexOf(
        'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/core'
      ) > -1) &&
    collections.some((collection) => collection.itemType === 'record')
  );
}

export function checkHasFeatures([collections, conformance]: [
  OgcApiCollectionInfo[],
  ConformanceClass[]
]) {
  return (
    conformance.indexOf(
      'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core'
    ) > -1 &&
    collections.some((collection) => collection.itemType === 'feature')
  );
}

/**
 * This does not include queryables and sortables!
 */
export function parseBaseCollectionInfo(
  doc: OgcApiDocument
): OgcApiCollectionInfo {
  const { links, ...props } = doc;
  const formats = links
    .filter((link) => link.rel === 'items')
    .map((link) => link.type);
  return { formats, ...props } as OgcApiCollectionInfo;
}

export function parseCollectionParameters(
  doc: OgcApiDocument
): CollectionParameter[] {
  if ('properties' in doc && typeof doc.properties === 'object') {
    return Object.keys(doc.properties).map((name) => {
      const prop = doc.properties[name];
      let type: CollectionParameterType = 'string';
      if (typeof prop.$ref === 'string') {
        const schemaRef = prop.$ref.toLowerCase();
        if (schemaRef.indexOf('point') > -1) type = 'point';
        else if (schemaRef.indexOf('linestring') > -1) type = 'linestring';
        else if (schemaRef.indexOf('polygon') > -1) type = 'polygon';
        else if (schemaRef.indexOf('geometry') > -1) type = 'geometry';
      } else if (
        typeof prop.type === 'string' &&
        CollectionParameterTypes.indexOf(prop.type.toLowerCase()) > -1
      ) {
        type = prop.type.toLowerCase();
      }
      return {
        name,
        type,
        ...(typeof prop.title === 'string' && { title: prop.title }),
      };
    });
  }
  if (Array.isArray(doc)) {
    return doc.map((prop) => ({
      name: prop,
      type: 'string',
    }));
  }
  return [];
}

export function parseTileMatrixSets(doc: OgcApiDocument): TileMatrixSet[] {
  if (Array.isArray(doc.tileMatrixSets)) {
    return doc.tileMatrixSets.map((set) => {
      return {
        id: set.id,
        uri: set.uri,
      };
    });
  }
  return [];
}
