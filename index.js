require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lb3rxqj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("searchTeacherDb"); // Use your DB name
    const usersCollection = db.collection("users");
    const tuitionRequestsCollection = db.collection("tuitionRequests");
    const jobsCollection = db.collection("jobs");

    // GET route to fetch all users
    app.get("/users", async (req, res) => {
      try {
        const allUsers = await usersCollection.find().toArray();
        res.send(allUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    // Save a new user
    app.post("/users", async (req, res) => {
      try {
        const {
          uid,
          name,
          gender,
          phone,
          email,
          city,
          location,
          accountType,
          image,
        } = req.body;

        if (!uid || !email) {
          return res.status(400).send({ error: "UID and email are required" });
        }

        const existingUser = await usersCollection.findOne({ uid });
        if (existingUser) {
          return res.status(400).send({ error: "User already exists" });
        }

        const newUser = {
          uid,
          name,
          gender,
          phone,
          email,
          city,
          location,
          accountType,
          image,
        };
        await usersCollection.insertOne(newUser);
        res.status(201).send(newUser);
      } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).send({ error: "Failed to save user" });
      }
    });

    // Get a user by uid
    app.get("/users/:uid", async (req, res) => {
      try {
        const uid = req.params.uid;
        const user = await usersCollection.findOne({ uid });

        if (!user) {
          return res.status(404).send({ error: "User not found" });
        }

        res.send(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ error: "Failed to fetch user" });
      }
    });

    // PATCH route to update user's accountType
    app.patch("/users/:uid/accountType", async (req, res) => {
      try {
        const uid = req.params.uid;
        const { accountType } = req.body;

        if (!accountType) {
          return res.status(400).send({ error: "Missing accountType" });
        }

        const result = await usersCollection.updateOne(
          { uid },
          { $set: { accountType } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "User not found" });
        }

        res.send({ message: `User updated to ${accountType}` });
      } catch (error) {
        console.error("Error updating accountType:", error);
        res.status(500).send({ error: "Failed to update accountType" });
      }
    });

    // Delete user by uid
    app.delete("/users/:uid", async (req, res) => {
      try {
        const uid = req.params.uid;
        const result = await usersCollection.deleteOne({ uid });

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "User not found" });
        }

        res.send({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: "Failed to delete user" });
      }
    });

    // tuition Requests

    app.post("/tuition-requests", async (req, res) => {
      try {
        const requestData = req.body;

        // Define only required fields
        const requiredFields = [
          "phoneNumber",
          "city",
          "location",
          "class",
          "subjects",
          "category",
          "tuitionType",
          "studentGender",
          "tutorGenderPreference",
          "salary",
          "daysPerWeek",
        ];

        const missing = requiredFields.filter((field) => !requestData[field]);
        if (missing.length > 0) {
          return res
            .status(400)
            .send({ error: `Missing required fields: ${missing.join(", ")}` });
        }

        // Optional field (no need to check)
        // requestData.additionalRequirements is optional

        const result = await tuitionRequestsCollection.insertOne(requestData);
        res.status(201).send({
          success: true,
          insertedId: result.insertedId,
          message: "Tuition request saved successfully",
        });
      } catch (error) {
        console.error("Error saving tuition request:", error);
        res.status(500).send({ error: "Failed to save tuition request" });
      }
    });

    // tuition get

    app.get("/tuition-requests", async (req, res) => {
      try {
        const allRequests = await tuitionRequestsCollection
          .find()
          .sort({ _id: -1 })
          .toArray();

        res.send(allRequests);
      } catch (error) {
        console.error("Error fetching tuition requests:", error);
        res.status(500).send({ error: "Failed to fetch tuition requests" });
      }
    });

    app.patch("/tuition-requests/:id/call-status", async (req, res) => {
      const { id } = req.params;
      const { isCalled } = req.body;

      try {
        const result = await tuitionRequestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { isCalled } }
        );

        if (result.modifiedCount === 1) {
          res.send({ success: true });
        } else {
          res.send({ success: false });
        }
      } catch (error) {
        console.error("Error updating call status:", error);
        res.status(500).send({ error: "Failed to update call status" });
      }
    });

    // job-requests

    app.post("/job-requests", async (req, res) => {
      try {
        const {
          jobTitle,
          tuitionType,
          category,
          studentGender,
          city,
          location,
          class: classLevel,
          subjects,
          daysPerWeek,
          tutorGenderPreference,
          salary,
          studentsNumber,
          tutoringTime,
        } = req.body;

        // Validate required fields
        const requiredFields = [
          "jobTitle",
          "tuitionType",
          "category",
          "studentGender",
          "city",
          "location",
          "class",
          "subjects",
          "daysPerWeek",
          "tutorGenderPreference",
          "salary",
          "studentsNumber",
          "tutoringTime",
        ];

        const missing = requiredFields.filter((field) => !req.body[field]);
        if (missing.length > 0) {
          return res.status(400).send({
            success: false,
            message: `Missing required fields: ${missing.join(", ")}`,
          });
        }

        // Format posted date
        const dateObj = new Date();
        const postedDate = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });

        let subjectsArray = [];
        if (typeof subjects === "string") {
          subjectsArray = subjects.split(",").map((s) => s.trim());
        } else if (Array.isArray(subjects)) {
          subjectsArray = subjects;
        }

        // Prepare job object
        const newJob = {
          title: jobTitle,
          type: tuitionType,
          category,
          studentGender,
          classLevel,
          subjects: subjectsArray,
          daysPerWeek,
          tutorGenderPreference,
          salary: Number(salary),
          studentsNumber: Number(studentsNumber),
          tutoringTime,
          location: `${location}, ${city}`,
          date: postedDate,
        };

        const result = await jobsCollection.insertOne(newJob);

        res.status(201).send({
          success: true,
          message: "Tuition job posted successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error posting job:", error);
        res.status(500).send({
          success: false,
          message: "Failed to post tuition job",
        });
      }
    });

    // GET all job posts
    app.get("/jobs", async (req, res) => {
      try {
        const jobs = await jobsCollection.find().sort({ _id: -1 }).toArray(); // সর্বশেষ পোস্ট প্রথমে দেখাবে
        res.status(200).send({
          success: true,
          data: jobs,
        });
      } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch jobs",
        });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("search teacher is live");
});

app.listen(port, () => {
  console.log(`search teacher is sitting on port ${port}`);
});
