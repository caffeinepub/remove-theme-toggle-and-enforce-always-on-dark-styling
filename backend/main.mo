import Map "mo:core/Map";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  type RecordingMetadata = {
    id : Text;
    name : Text;
    description : Text;
  };

  type Recording = {
    metadata : RecordingMetadata;
    measurements : Storage.ExternalBlob;
    owner : Principal;
  };

  let recordings = Map.empty<Text, Recording>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  public query ({ caller }) func getAllRecordings() : async [RecordingMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list recordings");
    };
    
    // Admins can see all recordings, regular users only see their own
    if (AccessControl.isAdmin(accessControlState, caller)) {
      recordings.values().map(func(recording) { recording.metadata }).toArray();
    } else {
      recordings.values()
        .filter(func(recording) { Principal.equal(recording.owner, caller) })
        .map(func(recording) { recording.metadata })
        .toArray();
    };
  };

  public shared ({ caller }) func saveRecording(
    id : Text,
    metadata : RecordingMetadata,
    measurements : Storage.ExternalBlob,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save recordings");
    };
    if (recordings.containsKey(id)) {
      Runtime.trap("Recording with this ID already exists");
    };
    recordings.add(id, { metadata; measurements; owner = caller });
  };

  public query ({ caller }) func getRecording(id : Text) : async Recording {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve recordings");
    };
    
    switch (recordings.get(id)) {
      case (null) { Runtime.trap("Recording does not exist") };
      case (?recording) {
        // Users can only access their own recordings, admins can access any
        if (not Principal.equal(recording.owner, caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only access your own recordings");
        };
        recording;
      };
    };
  };

  public shared ({ caller }) func deleteRecording(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete recordings");
    };
    
    switch (recordings.get(id)) {
      case (null) {
        Runtime.trap("Recording does not exist");
      };
      case (?recording) {
        // Users can only delete their own recordings, admins can delete any
        if (not Principal.equal(recording.owner, caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own recordings");
        };
        recordings.remove(id);
      };
    };
  };
};
