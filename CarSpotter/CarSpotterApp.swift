import SwiftUI
import SwiftData
import PhotosUI

func englishGeneration(_ label: String) -> String {
    var result = label.replacingOccurrences(of: "покол[іi]ння", with: "Generation", options: [.regularExpression, .caseInsensitive])
        .replacingOccurrences(of: "рестайл[іi]нг", with: "Facelift", options: [.regularExpression, .caseInsensitive])
    if result.contains("Generation"), let range = result.range(of: "^[IVXІ]+", options: .regularExpression) {
        result.replaceSubrange(range, with: String(result[range]).replacingOccurrences(of: "І", with: "I"))
    }
    return result
}

struct Car: Codable, Identifiable {
    let id: String
    let brand: String
    let name: String
    let generations: [Generation]
    var title: String { "\(brand) \(name)" }
}

struct Generation: Codable, Identifiable {
    let id: String
    let name: String
    let yearFrom: Int?
    let yearTo: Int?
    var label: String {
        guard let yearFrom else { return name }
        return "\(name) · \(String(yearFrom))–\(yearTo.map { String($0) } ?? "unspecified")"
    }
}

@Model
final class Sighting {
    var id: UUID
    var carID: String
    var carTitle: String
    var generationLabel: String?
    var generationID: String?
    var date: Date
    var note: String
    @Attribute(.externalStorage) var photo: Data?

    init(car: Car, generation: Generation?, note: String, photo: Data?) {
        id = UUID()
        carID = car.id
        carTitle = car.title
        generationID = generation?.id
        generationLabel = generation?.label
        date = Date()
        self.note = note
        self.photo = photo
    }
}

@MainActor
final class Catalogue: ObservableObject {
    @Published var cars: [Car] = []
    @Published var error: String?
    init() {
        do {
            guard let url = Bundle.main.url(forResource: "catalogue", withExtension: "json") else {
                throw CocoaError(.fileNoSuchFile)
            }
            cars = try JSONDecoder().decode([Car].self, from: Data(contentsOf: url))
        } catch {
            self.error = "The catalogue could not be loaded. \(error.localizedDescription)"
        }
    }
}

@main
struct CarSpotterApp: App {
    @StateObject private var catalogue = Catalogue()
    var body: some Scene {
        WindowGroup {
            TabView {
                CatalogueView(catalogue: catalogue)
                    .tabItem { Label("Catalogue", systemImage: "car") }
                GarageView(total: catalogue.cars.count)
                    .tabItem { Label("My garage", systemImage: "checkmark.circle") }
            }
        }
        .modelContainer(for: Sighting.self)
    }
}

struct CatalogueView: View {
    @ObservedObject var catalogue: Catalogue
    @Query private var sightings: [Sighting]
    @State private var search = ""
    var filtered: [Car] {
        catalogue.cars.filter { search.isEmpty || $0.title.localizedCaseInsensitiveContains(search) }
    }
    var brands: [String] { Array(Set(filtered.map(\.brand))).sorted() }
    var spottedIDs: Set<String> { Set(sightings.map(\.carID)) }
    var body: some View {
        NavigationStack {
            List {
                if let error = catalogue.error { Text(error).foregroundStyle(.red) }
                ForEach(brands, id: \.self) { brand in
                    Section(brand) {
                        ForEach(filtered.filter { $0.brand == brand }) { car in
                            NavigationLink {
                                CarDetail(car: car)
                            } label: {
                                HStack {
                                    Text(car.name)
                                    Spacer()
                                    if spottedIDs.contains(car.id) {
                                        Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .overlay {
                if filtered.isEmpty && catalogue.error == nil {
                    ContentUnavailableView.search(text: search)
                }
            }
            .navigationTitle("Catalogue")
            .searchable(text: $search, prompt: "Brand or model")
        }
    }
}

struct CarDetail: View {
    let car: Car
    @Query private var sightings: [Sighting]
    @State private var showLog = false
    var matching: [Sighting] { sightings.filter { $0.carID == car.id }.sorted { $0.date > $1.date } }
    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "car.side.fill").font(.system(size: 72)).foregroundStyle(.secondary)
                    Text("Reference photo not available").font(.caption).foregroundStyle(.secondary)
                    Text(car.title).font(.title2.bold())
                }
                .frame(maxWidth: .infinity).padding(.vertical)
                Button { showLog = true } label: {
                    Label("Log a sighting", systemImage: "plus.circle.fill")
                }
            }
            Section("Generations") {
                if car.generations.isEmpty {
                    Text("Generation details are not available yet. You can still log this model.")
                        .foregroundStyle(.secondary)
                }
                ForEach(car.generations) { Text($0.label) }
            }
            Section("Your sightings (\(matching.count))") {
                ForEach(matching) { sighting in
                    NavigationLink { SightingDetail(sighting: sighting) } label: {
                        SightingRow(sighting: sighting)
                    }
                }
            }
        }
        .navigationTitle(car.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showLog) { LogSighting(car: car) }
    }
}

struct LogSighting: View {
    let car: Car
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var generationID = ""
    @State private var note = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var photo: Data?
    @State private var loading = false
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                Section(car.title) {
                    if !car.generations.isEmpty {
                        Picker("Generation", selection: $generationID) {
                            Text("Not sure / model only").tag("")
                            ForEach(car.generations) { Text($0.label).tag($0.id) }
                        }
                    }
                    TextField("Short note (optional)", text: $note, axis: .vertical)
                        .onChange(of: note) { _, value in note = String(value.prefix(500)) }
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Label(photo == nil ? "Add photo (optional)" : "Change photo", systemImage: "photo")
                    }
                    if loading { ProgressView("Loading photo…") }
                    if let photo, let image = UIImage(data: photo) {
                        Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 220)
                        Button("Remove photo", role: .destructive) { selectedPhoto = nil; self.photo = nil }
                    }
                    Text("Photos document your sighting; they are not independently verified.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                if let error { Text(error).foregroundStyle(.red) }
            }
            .navigationTitle("New sighting")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }.disabled(loading)
                }
            }
            .task(id: selectedPhoto) {
                guard let selectedPhoto else { return }
                loading = true
                defer { loading = false }
                do {
                    guard let data = try await selectedPhoto.loadTransferable(type: Data.self),
                          let image = UIImage(data: data) else { throw CocoaError(.fileReadCorruptFile) }
                    try Task.checkCancellation()
                    let size = image.size
                    let scale = min(1, 1600 / max(size.width, size.height))
                    let targetSize = CGSize(width: size.width * scale, height: size.height * scale)
                    let renderer = UIGraphicsImageRenderer(size: targetSize)
                    photo = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: targetSize)) }.jpegData(compressionQuality: 0.8)
                    error = nil
                } catch is CancellationError {
                } catch { self.error = "Could not load this photo. Choose another image." }
            }
        }
    }
    private func save() {
        let sighting = Sighting(car: car, generation: car.generations.first { $0.id == generationID },
                                note: note.trimmingCharacters(in: .whitespacesAndNewlines), photo: photo)
        context.insert(sighting)
        do { try context.save(); dismiss() }
        catch { context.delete(sighting); self.error = "Could not save the sighting. Please try again." }
    }
}

struct SightingRow: View {
    let sighting: Sighting
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(sighting.carTitle).font(.headline)
            if let generation = sighting.generationLabel { Text(englishGeneration(generation)).font(.caption) }
            Text(sighting.date, style: .date).font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct SightingDetail: View {
    let sighting: Sighting
    var body: some View {
        List {
            SightingRow(sighting: sighting)
            if let photo = sighting.photo, let image = UIImage(data: photo) {
                Image(uiImage: image).resizable().scaledToFit()
            }
            if !sighting.note.isEmpty { Text(sighting.note) }
        }
        .navigationTitle("Sighting")
    }
}

struct GarageView: View {
    let total: Int
    @Query(sort: \Sighting.date, order: .reverse) private var sightings: [Sighting]
    @Environment(\.modelContext) private var context
    @State private var error: String?
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("\(Set(sightings.map(\.carID)).count) of \(total) models spotted")
                    Text("\(sightings.count) sightings").foregroundStyle(.secondary)
                }
                if let error { Text(error).foregroundStyle(.red) }
                Section("Sightings") {
                    ForEach(sightings) { sighting in
                        NavigationLink { SightingDetail(sighting: sighting) } label: {
                            SightingRow(sighting: sighting)
                        }
                    }
                    .onDelete { offsets in
                        for index in offsets { context.delete(sightings[index]) }
                        do { try context.save() }
                        catch { context.rollback(); error = "Could not delete the sighting." }
                    }
                }
            }
            .overlay {
                if sightings.isEmpty {
                    ContentUnavailableView("Start your collection", systemImage: "car.side", description: Text("Find a car in the catalogue and log your first sighting."))
                }
            }
            .navigationTitle("My garage")
        }
    }
}
