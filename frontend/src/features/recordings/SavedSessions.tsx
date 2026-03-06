import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Download, Trash2, Loader2 } from 'lucide-react';
import { useGetAllRecordings, useSaveRecording, useDeleteRecording } from './useRecordings';
import { ExternalBlob } from '../../backend';
import { generateCSV, downloadCSV, IMUSample } from '../imu/csvExport';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useActor } from '../../hooks/useActor';

interface SavedSessionsProps {
  currentRecording: { samples: IMUSample[]; hasMagnetometer: boolean } | null;
}

export function SavedSessions({ currentRecording }: SavedSessionsProps) {
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { actor } = useActor();
  const { data: recordings = [], isLoading: loadingRecordings } = useGetAllRecordings();
  const saveRecording = useSaveRecording();
  const deleteRecording = useDeleteRecording();

  const handleSave = async () => {
    if (!currentRecording || !saveName.trim()) {
      toast.error('Please enter a name for the recording');
      return;
    }

    try {
      const csv = generateCSV(currentRecording.samples, currentRecording.hasMagnetometer);
      const csvBytes = new TextEncoder().encode(csv);
      const blob = ExternalBlob.fromBytes(csvBytes);

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await saveRecording.mutateAsync({
        id,
        metadata: {
          id,
          name: saveName,
          description: saveDescription,
        },
        measurements: blob,
      });

      toast.success('Recording saved successfully');
      setSaveName('');
      setSaveDescription('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save recording');
    }
  };

  const handleDownload = async (id: string, name: string) => {
    if (!actor) {
      toast.error('Actor not available');
      return;
    }

    try {
      setDownloadingId(id);
      const recording = await actor.getRecording(id);
      
      const bytes = await recording.measurements.getBytes();
      const csv = new TextDecoder().decode(bytes);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadCSV(csv, `${name}-${timestamp}.csv`);
      toast.success('Recording downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download recording');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecording.mutateAsync(id);
      toast.success('Recording deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete recording');
    }
  };

  return (
    <>
      <Toaster />
      <Card>
        <CardHeader>
          <CardTitle>Cloud Storage</CardTitle>
          <CardDescription>Save and manage your recordings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentRecording && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Save Current Recording</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="save-name">Name</Label>
                  <Input
                    id="save-name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="My IMU Recording"
                  />
                </div>
                <div>
                  <Label htmlFor="save-description">Description (optional)</Label>
                  <Input
                    id="save-description"
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Walking test, device in pocket"
                  />
                </div>
                <Button onClick={handleSave} disabled={saveRecording.isPending || !saveName.trim()} className="gap-2 w-full">
                  {saveRecording.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to Cloud
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Saved Recordings</h3>
              {loadingRecordings && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            {recordings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No saved recordings yet</p>
            ) : (
              <div className="space-y-2">
                {recordings.map((recording) => (
                  <div key={recording.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{recording.name}</p>
                      {recording.description && <p className="text-sm text-muted-foreground truncate">{recording.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(recording.id, recording.name)}
                        disabled={downloadingId === recording.id}
                        className="gap-2"
                      >
                        {downloadingId === recording.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(recording.id)}
                        disabled={deleteRecording.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

