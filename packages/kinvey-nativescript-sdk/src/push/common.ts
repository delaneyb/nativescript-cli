import { Promise } from 'es6-promise';
import { EventEmitter } from 'events';

import { device as Device } from 'tns-core-modules/platform';
import {
  client,
  KinveyError,
  NotFoundError,
  User,
  AuthType,
  KinveyRequest,
  RequestMethod,
  DataAccess
} from './kinvey-nativescript-sdk';
import { PushConfig } from './';

const deviceCollectionName = '__device';

export class PushCommon extends EventEmitter {
  private _offlineRepoPromise: Promise<any>;

  get client() {
    return client();
  }

  onNotification(listener: (data: any) => void) {
    return (this as any).on('notification', listener);
  }

  onceNotification(listener: (data: any) => void) {
    return (this as any).once('notification', listener);
  }

  register(options = <PushConfig>{}) {
    return this._registerWithPushPlugin(options)
      .then((token) => {
        if (!token) {
          throw new KinveyError('Unable to retrieve the device token to register this device for push notifications.');
        }

        return this._registerWithKinvey(token, options);
      })
      .then((token) => {
        return this._saveTokenToCache(token);
      });
  }

  unregister(options = <PushConfig>{}) {
    return this._unregisterWithPushPlugin(options)
      .then(() => {
        return this._getTokenFromCache();
      })
      .then((token) => {
        if (!token) {
          throw new KinveyError('Unable to retrieve the device token to unregister this device for push notifications.');
        }

        return this._unregisterWithKinvey(token, options);
      })
      .then(() => {
        return this._deleteTokenFromCache();
      });
  }

  protected _registerWithPushPlugin(options = <PushConfig>{}): Promise<string> {
    return Promise.reject(new KinveyError('Unable to register for push notifications.'));
  }

  protected _unregisterWithPushPlugin(options = <PushConfig>{}): Promise<null> {
    return Promise.reject(new KinveyError('Unable to unregister for push notifications.'));
  }

  private _registerWithKinvey(token: string, options = <PushConfig>{}): Promise<string> {
    const activeUser = User.getActiveUser(this.client);

    if (!activeUser) {
      return Promise.reject(new KinveyError('Unable to register this device for push notifications.',
        'You must login a user.'));
    }

    const request = new KinveyRequest({
      method: RequestMethod.POST,
      url: `${this.client.apiHostname}/push/${this.client.appKey}/register-device`,
      authType: activeUser ? AuthType.Session : AuthType.Master,
      data: {
        platform: Device.os.toLowerCase(),
        framework: 'nativescript',
        deviceId: token
      },
      timeout: options.timeout,
      client: this.client
    });
    return request.execute().then(() => token);
  }

  private _unregisterWithKinvey(token: string, options = <PushConfig>{}): Promise<string> {
    const activeUser = User.getActiveUser(this.client);

    if (!activeUser) {
      return Promise.reject(new KinveyError('Unable to unregister this device for push notifications.',
        'You must login a user.'));
    }

    const request = new KinveyRequest({
      method: RequestMethod.POST,
      url: `${this.client.apiHostname}/push/${this.client.appKey}/unregister-device`,
      authType: activeUser ? AuthType.Session : AuthType.Master,
      data: {
        platform: Device.os.toLowerCase(),
        framework: 'nativescript',
        deviceId: token
      },
      timeout: options.timeout,
      client: this.client
    });
    return request.execute().then(response => response.data);
  }

  private _getTokenFromCache(): Promise<string | null> {
    const activeUser = User.getActiveUser(this.client);

    if (!activeUser) {
      throw new KinveyError('Unable to retrieve device token.',
        'You must login a user.');
    }

    return this._getOfflineRepo()
      .then(repo => repo.readById(deviceCollectionName, activeUser._id))
      .catch((error) => {
        if (error instanceof NotFoundError) {
          return {} as any;
        }

        throw error;
      })
      .then((device) => {
        if (device) {
          return device.token;
        }

        return null;
      });
  }

  private _saveTokenToCache(token: any): Promise<string> {
    const activeUser = User.getActiveUser(this.client);

    if (!activeUser) {
      throw new KinveyError('Unable to save device token.',
        'You must login a user.');
    }

    const device = {
      _id: activeUser._id,
      userId: activeUser._id,
      token: token
    };

    return this._getOfflineRepo()
      .then(repo => repo.update(deviceCollectionName, device))
      .then(() => token);
  }

  private _deleteTokenFromCache(): Promise<null> {
    const activeUser = User.getActiveUser(this.client);

    if (!activeUser) {
      throw new KinveyError('Unable to delete device token.',
        'You must login a user.');
    }

    return this._getOfflineRepo()
      .then((repo) => repo.deleteById(deviceCollectionName, activeUser._id))
      .then(() => null);
  }

  private _getOfflineRepo() {
    if (!this._offlineRepoPromise) {
      this._offlineRepoPromise = DataAccess.repositoryProvider.getOfflineRepository();
    }
    return this._offlineRepoPromise;
  }
}