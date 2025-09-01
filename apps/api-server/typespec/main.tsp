import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using Http;
using OpenAPI;

@service(#{
  title: "Taskgraph API"
})
@OpenAPI.info(#{
  version: "1.0.0"
})
@server("http://localhost:9393/api", "Development server")
namespace TaskgraphAPI;

// Error models
@error
model ApiError {
  code: string;
  message: string;
  details?: ErrorDetails;
  timestamp: utcDateTime;
  requestId: string;
}

model ErrorDetails {
  taskName?: string;
  projectId?: string;
  validationErrors?: ValidationError[];
}

model ValidationError {
  field: string;
  message: string;
}

// Task models
model Task {
  name: string;
  description: string;
  depends?: string[];
  notes?: string[];
  difficulty?: float32;
  issueNumber?: int32;
  addition?: TaskAddition;
}

model TaskAddition {
  field?: "front" | "back" | "infra" | "other" | "parent" | "";
  category?: string;
  baseDifficulty?: float32;
  requirements?: string[];
  implementation_notes?: string[];
  api_schemas?: string[];
  design_images?: string[];
}

model Project {
  id: string;
  name: string;
}

model TaskGraph {
  version: string;
  tasks: Record<Task>;
}

// Request/Response models
model CreateTaskRequest {
  name: string;
  description: string;
  depends?: string[];
  difficulty?: float32;
  issueNumber?: int32;
  addition?: TaskAddition;
}

model UpdateTaskRequest {
  description?: string;
  depends?: string[];
  difficulty?: float32;
  issueNumber?: int32;
  addition?: TaskAddition;
}

model UpdateNotesRequest {
  notes: string[];
}

model UpdateImplementationNotesRequest {
  implementation_notes: string[];
}

model UpdateRequirementsRequest {
  requirements: string[];
}

// API endpoints
@route("/projects")
interface Projects {
  @get
  @summary("List all projects")
  list(): Project[] | ApiError;
}

@route("/projects/{projectId}")
interface ProjectOperations {
  @get
  @summary("Get project taskgraph")
  get(@path projectId: string): TaskGraph | ApiError;
}

@route("/projects/{projectId}/tasks")
interface Tasks {
  @post
  @summary("Create a new task")
  create(
    @path projectId: string,
    @body task: CreateTaskRequest
  ): Task | ApiError;
}

@route("/projects/{projectId}/tasks/{taskName}")
interface TaskOperations {
  @get
  @summary("Get a specific task")
  get(
    @path projectId: string,
    @path taskName: string
  ): Task | ApiError;

  @put
  @summary("Update a task")
  update(
    @path projectId: string,
    @path taskName: string,
    @body task: UpdateTaskRequest
  ): Task | ApiError;

  @delete
  @summary("Delete a task")
  delete(
    @path projectId: string,
    @path taskName: string
  ): void | ApiError;
}

@route("/projects/{projectId}/tasks/{taskName}/notes")
interface TaskNotes {
  @patch
  @summary("Update task notes")
  update(
    @path projectId: string,
    @path taskName: string,
    @body request: UpdateNotesRequest
  ): Task | ApiError;
}

@route("/projects/{projectId}/tasks/{taskName}/implementation")
interface TaskImplementation {
  @patch
  @summary("Update task implementation notes")
  update(
    @path projectId: string,
    @path taskName: string,
    @body request: UpdateImplementationNotesRequest
  ): Task | ApiError;
}

@route("/projects/{projectId}/tasks/{taskName}/requirements")
interface TaskRequirements {
  @patch
  @summary("Update task requirements")
  update(
    @path projectId: string,
    @path taskName: string,
    @body request: UpdateRequirementsRequest
  ): Task | ApiError;
}