<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends ContentController
{
    protected string $modelClass = Event::class;
    protected string $resourceClass = EventResource::class;
    protected array $searchable = ['title', 'summary', 'description', 'location'];
    protected array $filters = [
        'type' => 'type',
        'featured' => 'featured',
    ];
    protected string $orderBy = 'starts_at';
    protected string $orderDir = 'asc';

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'startsAt' => 'nullable|date',
            'endsAt' => 'nullable|date',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'type' => 'type',
            'summary' => 'summary',
            'description' => 'description',
            'startsAt' => 'starts_at',
            'endsAt' => 'ends_at',
            'isOnline' => 'is_online',
            'location' => 'location',
            'registrationUrl' => 'registration_url',
            'featuredImage' => 'featured_image',
            'featured' => 'featured',
            'published' => 'published',
        ];

        $attrs = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) {
                $attrs[$col] = $data[$in];
            }
        }

        if (! $updating && isset($data['title'])) {
            $attrs['slug'] = $data['slug'] ?? $data['title'];
        }

        return $attrs;
    }
}
