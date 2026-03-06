import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from '../../hooks/useActor';
import type { RecordingMetadata, Recording } from '../../backend';
import { ExternalBlob } from '../../backend';

export function useGetAllRecordings() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<RecordingMetadata[]>({
    queryKey: ['recordings'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllRecordings();
      } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
          throw new Error('You must be logged in to view recordings');
        }
        throw error;
      }
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetRecording(id: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Recording | null>({
    queryKey: ['recording', id],
    queryFn: async () => {
      if (!actor || !id) return null;
      try {
        return await actor.getRecording(id);
      } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
          throw new Error('You do not have permission to access this recording');
        }
        throw error;
      }
    },
    enabled: !!actor && !actorFetching && !!id,
  });
}

export function useSaveRecording() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, metadata, measurements }: { id: string; metadata: RecordingMetadata; measurements: ExternalBlob }) => {
      if (!actor) throw new Error('Actor not available');
      try {
        await actor.saveRecording(id, metadata, measurements);
      } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
          throw new Error('You must be logged in to save recordings');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
    },
  });
}

export function useDeleteRecording() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      try {
        await actor.deleteRecording(id);
      } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
          throw new Error('You do not have permission to delete this recording');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
    },
  });
}

